"""
AI Matching and Recipient Ranking Engine.
Implements Section 4 of the Master Specification:
- Stage 1: Hard eligibility constraints (verified NGO, cold chain, deadline, distance, safety hold).
- Stage 2: Explainable multi-criteria heuristic ranking (35% distance, 30% urgency, 20% capacity, 15% reliability).
- Persistent candidate match generation in the database.
- Split-donation multi-recipient allocation support.
- In-app notification dispatch for recipient kitchen coordinators.
"""

from datetime import datetime, timezone
import logging
import math
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.donation import Donation
from app.models.match import Match
from app.models.notification import Notification
from app.models.organization import Organization
from app.models.pickup import Pickup
from app.models.user import User
from app.schemas.matching import (
    RecipientMatchResponse,
    ScoreBreakdownSchema,
    SplitDonationAllocationItem,
    SplitDonationPlanResponse,
)

logger = logging.getLogger("lastplate.matching_engine")


class MatchingEngine:
    """
    Two-stage AI matching and recipient ranking engine.
    Computes explainable scores, generates persistent match pairings,
    and calculates split-donation distribution plans.
    """

    EARTH_RADIUS_KM: float = 6371.0
    MAX_OPERATIONAL_DISTANCE_KM: float = 25.0

    @classmethod
    def compute_haversine_km(
        cls, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Haversine formula for spherical distance in kilometers between two GPS coordinates."""
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return cls.EARTH_RADIUS_KM * c

    @classmethod
    def evaluate_stage1_hard_filters(
        cls,
        recipient: Organization,
        donation: Donation,
        dist_km: float,
    ) -> Tuple[bool, str]:
        """
        Stage 1 Hard Eligibility Constraints (Master Spec Section 4):
        1. Recipient must be verified.
        2. Recipient must be an NGO shelter, community kitchen, or food bank.
        3. Donation status must be 'available' or 'matched' (no unresolved safety hold).
        4. Pickup deadline must be in the future.
        5. Cold storage compatibility: if food requires cold chain, recipient must have refrigeration.
        6. Transit distance must be within operational city range (< 25 km).
        7. Dietary compatibility: recipient must be able to accept the food category.
        """
        if not recipient.is_verified:
            return False, "Recipient organization is not yet verified."

        if recipient.org_type not in ("ngo_shelter", "community_kitchen", "food_bank"):
            return False, f"Organization type '{recipient.org_type}' is not an eligible recipient."

        if donation.status not in ("available", "matched"):
            return False, f"Donation status '{donation.status}' is not eligible for matching."

        now = datetime.now(timezone.utc)
        deadline = (
            donation.pickup_deadline
            if donation.pickup_deadline.tzinfo
            else donation.pickup_deadline.replace(tzinfo=timezone.utc)
        )
        if deadline <= now:
            return False, "Pickup collection window has expired."

        # Cold storage compatibility
        if donation.storage_condition in ("refrigerated", "frozen", "dairy_chilled"):
            if not recipient.refrigeration_available:
                return False, f"Donation requires cold holding ({donation.storage_condition}) but recipient has no refrigeration."

        # Operational radius check
        if dist_km > cls.MAX_OPERATIONAL_DISTANCE_KM:
            return False, f"Distance ({dist_km:.1f} km) exceeds maximum operational radius (25 km)."

        # Dietary capabilities check
        if recipient.dietary_capabilities:
            caps = [str(c).lower() for c in recipient.dietary_capabilities]
            if "all" not in caps:
                # Check vegetarian / vegan constraints
                if "vegetarian" in caps and donation.food_type in ("meat", "poultry", "seafood"):
                    return False, "Recipient only accepts vegetarian food."
                if "vegan" in caps and (
                    donation.food_type in ("meat", "poultry", "seafood", "dairy_chilled")
                    or donation.storage_condition == "dairy_chilled"
                ):
                    return False, "Recipient is strictly vegan."

        return True, "Eligible"

    @classmethod
    async def calculate_recipient_reliability(
        cls, recipient_id: uuid.UUID, db: AsyncSession
    ) -> float:
        """
        Calculates recipient historical reliability based on completed pickups.
        Section 4: Verified historical reliability (15%).
        """
        stmt = (
            select(
                func.count().label("total"),
                func.count().filter(Pickup.status == "delivered").label("delivered"),
            )
            .select_from(Pickup)
            .where(
                Pickup.recipient_organization_id == recipient_id,
                Pickup.status.in_(["delivered", "failed"]),
            )
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row or row.total == 0:
            return 92.0  # Baseline reliability score for verified recipient with no past failures

        total = row.total
        delivered = row.delivered
        rate = (delivered / total) * 100.0
        return round(max(50.0, min(100.0, rate)), 1)

    @classmethod
    async def calculate_stage2_ranked_score(
        cls,
        recipient: Organization,
        donation: Donation,
        dist_km: float,
        db: AsyncSession,
    ) -> Tuple[ScoreBreakdownSchema, str, int]:
        """
        Stage 2 Heuristic Ranking Breakdown (Section 4):
        - Distance (35% weight)
        - Urgency (30% weight)
        - Capacity (20% weight)
        - Reliability (15% weight)
        """
        now = datetime.now(timezone.utc)
        deadline = (
            donation.pickup_deadline
            if donation.pickup_deadline.tzinfo
            else donation.pickup_deadline.replace(tzinfo=timezone.utc)
        )

        # 1. Distance Score (35%): Shorter travel = higher score
        distance_score = round(max(0.0, min(100.0, 100.0 - (dist_km * 7.0))), 1)

        # 2. Urgency Score (30%): Imminent deadline = higher rescue urgency
        time_remaining_hours = max(0.1, (deadline - now).total_seconds() / 3600.0)
        if time_remaining_hours <= 2.0:
            urgency_score = 98.0
        elif time_remaining_hours <= 4.0:
            urgency_score = 90.0
        elif time_remaining_hours <= 8.0:
            urgency_score = 80.0
        else:
            urgency_score = 65.0

        # 3. Capacity Score (20%): Match portions with recipient daily capacity
        capacity_ratio = recipient.max_daily_meals / max(1, donation.portions)
        if capacity_ratio >= 1.5:
            capacity_score = 95.0
        elif capacity_ratio >= 0.8:
            capacity_score = 88.0
        elif capacity_ratio >= 0.3:
            capacity_score = 75.0
        else:
            capacity_score = 50.0

        # 4. Reliability Score (15%): Recipient audit compliance rating
        reliability_score = await cls.calculate_recipient_reliability(recipient.id, db)

        # Total Composite Score
        total_score = round(
            (0.35 * distance_score)
            + (0.30 * urgency_score)
            + (0.20 * capacity_score)
            + (0.15 * reliability_score),
            1,
        )

        travel_time_mins = max(5, int(dist_km * 2.5 + 5))

        explanation = (
            f"Proximity: {dist_km:.1f} km (~{travel_time_mins} min transit). "
            f"Capacity: {recipient.max_daily_meals} meals/day vs {donation.portions} portions. "
            f"Urgency: Window closes in {time_remaining_hours:.1f}h. "
            f"Reliability: {reliability_score}%."
        )

        breakdown = ScoreBreakdownSchema(
            distanceScore=distance_score,
            urgencyScore=urgency_score,
            capacityScore=capacity_score,
            reliabilityScore=reliability_score,
            totalScore=total_score,
        )
        return breakdown, explanation, travel_time_mins

    @classmethod
    async def find_and_rank_recipients(
        cls, donation: Donation, db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """
        Discovers all eligible recipient organizations for a given donation,
        filters via Stage 1, scores via Stage 2, and returns a sorted list.
        """
        donor_org = donation.donor_organization
        if not donor_org:
            org_res = await db.execute(
                select(Organization).where(Organization.id == donation.donor_organization_id)
            )
            donor_org = org_res.scalar_one_or_none()
            if not donor_org:
                logger.error(f"Donor organization {donation.donor_organization_id} not found.")
                return []

        # Fetch all candidate recipient organizations
        recipients_stmt = select(Organization).where(
            Organization.org_type.in_(["ngo_shelter", "community_kitchen", "food_bank"]),
            Organization.is_verified == True,  # noqa: E712
        )
        recipients_res = await db.execute(recipients_stmt)
        recipients = recipients_res.scalars().all()

        ranked_candidates: List[Dict[str, Any]] = []

        for recipient in recipients:
            dist_km = cls.compute_haversine_km(
                donor_org.latitude, donor_org.longitude,
                recipient.latitude, recipient.longitude,
            )

            is_eligible, reason = cls.evaluate_stage1_hard_filters(recipient, donation, dist_km)
            if not is_eligible:
                continue

            breakdown, explanation, travel_time = await cls.calculate_stage2_ranked_score(
                recipient, donation, dist_km, db
            )

            ranked_candidates.append(
                {
                    "recipient": recipient,
                    "distance_km": round(dist_km, 1),
                    "travel_time_mins": travel_time,
                    "score_breakdown": breakdown,
                    "explanation": explanation,
                    "score": breakdown.totalScore,
                }
            )

        # Sort descending by composite score
        ranked_candidates.sort(key=lambda x: x["score"], reverse=True)
        return ranked_candidates

    @classmethod
    async def match_and_persist_donation(
        cls, donation_id: uuid.UUID, db: AsyncSession, notify: bool = True
    ) -> List[Match]:
        """
        Matches a donation with eligible recipients, creates/updates Match records,
        and dispatches in-app notifications to recipient users.
        """
        stmt = (
            select(Donation)
            .options(selectinload(Donation.donor_organization))
            .where(Donation.id == donation_id)
        )
        res = await db.execute(stmt)
        donation = res.scalar_one_or_none()
        if not donation:
            logger.warning(f"Donation {donation_id} not found for matching.")
            return []

        if donation.status not in ("available", "matched"):
            logger.info(f"Donation {donation_id} has status '{donation.status}', skipping matching.")
            return []

        candidates = await cls.find_and_rank_recipients(donation, db)
        if not candidates:
            logger.info(f"No eligible recipient organizations found for donation {donation_id}.")
            return []

        created_matches: List[Match] = []
        notifications_to_add: List[Notification] = []

        # Process top candidate recipients (up to top 5)
        top_candidates = candidates[:5]

        for cand in top_candidates:
            recipient = cand["recipient"]
            score = cand["score"]
            breakdown = cand["score_breakdown"]
            explanation = cand["explanation"]

            # Check if Match already exists for this pair
            match_stmt = select(Match).where(
                Match.donation_id == donation.id,
                Match.recipient_organization_id == recipient.id,
            )
            match_res = await db.execute(match_stmt)
            existing_match = match_res.scalar_one_or_none()

            breakdown_dict = {
                "distance": breakdown.distanceScore,
                "urgency": breakdown.urgencyScore,
                "capacity": breakdown.capacityScore,
                "reliability": breakdown.reliabilityScore,
                "total": breakdown.totalScore,
                "explanation": explanation,
                "distance_km": cand["distance_km"],
                "travel_time_mins": cand["travel_time_mins"],
            }

            if existing_match:
                existing_match.score = score
                existing_match.score_breakdown = breakdown_dict
                if existing_match.status == "expired":
                    existing_match.status = "suggested"
                created_matches.append(existing_match)
            else:
                new_match = Match(
                    donation_id=donation.id,
                    recipient_organization_id=recipient.id,
                    score=score,
                    score_breakdown=breakdown_dict,
                    status="suggested",
                )
                db.add(new_match)
                created_matches.append(new_match)

            # Generate notification for active recipient users
            if notify:
                users_stmt = select(User).where(
                    User.organization_id == recipient.id,
                    User.is_active == True,  # noqa: E712
                )
                users_res = await db.execute(users_stmt)
                users = users_res.scalars().all()

                for u in users:
                    notif = Notification(
                        user_id=u.id,
                        title="New Surplus Food Match Available",
                        message=(
                            f"Surplus offer '{donation.title}' ({donation.portions} portions, "
                            f"{donation.quantity_kg}kg) matches your kitchen with a {score}% score. "
                            f"Proximity: {cand['distance_km']} km."
                        ),
                        notification_type="match_offer",
                        is_read=False,
                        metadata_json={
                            "donation_id": str(donation.id),
                            "donor_organization_id": str(donation.donor_organization_id),
                            "score": score,
                            "portions": donation.portions,
                            "quantity_kg": donation.quantity_kg,
                            "pickup_deadline": donation.pickup_deadline.isoformat(),
                        },
                    )
                    notifications_to_add.append(notif)

        if notifications_to_add:
            db.add_all(notifications_to_add)

        # Transition donation status from 'available' to 'matched'
        if donation.status == "available" and created_matches:
            donation.status = "matched"

        await db.commit()
        for m in created_matches:
            await db.refresh(m)

        logger.info(
            f"Successfully matched donation {donation_id} with {len(created_matches)} recipients. "
            f"Dispatched {len(notifications_to_add)} notifications."
        )
        return created_matches

    @classmethod
    async def calculate_split_plan(
        cls, donation: Donation, db: AsyncSession
    ) -> SplitDonationPlanResponse:
        """
        Calculates a split-donation redistribution plan across multiple shelters
        when batch portions exceed single recipient capacity or for optimized distribution.
        """
        candidates = await cls.find_and_rank_recipients(donation, db)
        total_portions = donation.portions
        total_kg = donation.quantity_kg
        portion_weight_kg = total_kg / max(1, total_portions)

        allocations: List[SplitDonationAllocationItem] = []
        remaining_portions = total_portions

        # Allocate portions across candidates
        for cand in candidates:
            if remaining_portions <= 0:
                break

            recipient = cand["recipient"]
            # Recipient can take up to 75% of their daily meal capacity or remaining portions
            max_take = max(10, int(recipient.max_daily_meals * 0.75))
            portion_alloc = min(remaining_portions, max_take)

            if portion_alloc <= 0:
                continue

            kg_alloc = round(portion_alloc * portion_weight_kg, 2)
            pct = round((portion_alloc / total_portions) * 100.0, 1)

            allocations.append(
                SplitDonationAllocationItem(
                    recipient_id=recipient.id,
                    recipient_name=recipient.name,
                    allocated_portions=portion_alloc,
                    allocated_quantity_kg=kg_alloc,
                    percentage_of_total=pct,
                    distance_km=cand["distance_km"],
                    score=cand["score"],
                )
            )
            remaining_portions -= portion_alloc

        allocated_total = total_portions - remaining_portions
        is_split = len(allocations) > 1

        notes = (
            f"Split donation recommended across {len(allocations)} recipient kitchens "
            f"to ensure full utilization within the collection window."
            if is_split
            else "Single recipient has sufficient operational capacity for entire surplus batch."
        )

        return SplitDonationPlanResponse(
            donation_id=donation.id,
            total_portions=total_portions,
            total_quantity_kg=total_kg,
            is_split_recommended=is_split,
            allocated_portions=allocated_total,
            unallocated_portions=remaining_portions,
            allocations=allocations,
            notes=notes,
        )


matching_engine = MatchingEngine()
