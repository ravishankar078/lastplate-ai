import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Truck, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Scale, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { matchingService } from '../../services/api/matchingService';
import { MatchRecommendation } from '../../types';

export const NGOPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = async () => {
    setLoading(true);
    const recs = await matchingService.getRecommendationsForNGO(user?.organizationId || 'org-ngo-01');
    setMatches(recs);
    setLoading(false);
  };

  useEffect(() => {
    loadMatches();
  }, [user]);

  const handleAcceptMatch = async (match: MatchRecommendation) => {
    const success = await matchingService.acceptMatch(
      match.donationId,
      user?.organizationId || 'org-ngo-01',
      user?.organizationName || 'Hope Community Shelter'
    );

    if (success) {
      showToast(
        'Donation Offer Accepted!',
        `Atomic claim secured. Volunteer collection route scheduled for ${match.donation.title}.`,
        'success'
      );
      // Remove or update the accepted match
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
    } else {
      showToast('Offer Expired / Already Claimed', 'Another community organization claimed this batch.', 'error');
      loadMatches();
    }
  };

  const handleDeclineMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    showToast('Offer Declined', 'Surplus routed to next eligible kitchen in ranking queue.', 'info');
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-soft">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
            Community Feeding Organization Portal
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-0.5">
            {user?.organizationName || 'Hope Community Shelter & Kitchen'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Director: <strong>{user?.fullName}</strong> &bull; Non-Profit EIN Verified &bull; Commercial Walk-in Coolers Active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="md">
            Capacity: 250 Meals/Day
          </Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Daily Remaining Capacity"
          value="180 meals"
          icon={Scale}
          subtext="70 meals accepted today"
          badge={{ label: 'Space Available', variant: 'forest' }}
        />
        <StatCard
          title="Available Ranked Offers"
          value={matches.length}
          icon={Compass}
          subtext="Matching dietary & storage SOP"
          badge={{ label: 'AI Stage 2', variant: 'amber' }}
        />
        <StatCard
          title="Incoming In-Transit"
          value="1 dispatch"
          icon={Truck}
          subtext="ETA: 17:45 (Vol: Alex R.)"
          trend={{ direction: 'neutral', label: 'On Schedule' }}
        />
        <StatCard
          title="Safety Verification Rate"
          value="100%"
          icon={ShieldCheck}
          subtext="Temperature verified on arrival"
          badge={{ label: 'Good Standing', variant: 'emerald' }}
        />
      </div>

      {/* Available Ranked Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-forest-950">
              AI Stage 2 Ranked Surplus Matches
            </h3>
            <p className="text-xs text-stone-600">
              Filtered for non-allergen conflict, operating hours, and road travel feasibility.
            </p>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            Updated in real-time
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Running Stage 2 AI matching calculations..." />
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            title="All matched donations have been accepted"
            description="When local restaurants post surplus matching your capacity and dietary criteria, they will appear here with explainable ranking scores."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {matches.map((match) => {
              const score = match.scoreBreakdown.totalScore;
              return (
                <div
                  key={match.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-soft hover:shadow-soft-lg transition-all space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          {match.donation.donorType} &bull; {match.donation.donorOrgName}
                        </span>
                        <span className="text-stone-300">&bull;</span>
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          {match.roadDistanceKm.toFixed(1)} km away (~{match.estimatedTravelTimeMinutes} min travel)
                        </span>
                      </div>
                      <h4 className="font-serif text-xl font-bold text-forest-950">
                        {match.donation.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-stone-600 max-w-2xl">
                        {match.donation.description}
                      </p>
                    </div>

                    {/* Score Badge */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-stone-200 text-center shrink-0 min-w-[130px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                        Match Score
                      </span>
                      <span className="text-3xl font-extrabold font-serif text-forest-900">
                        {score} <span className="text-xs font-normal text-stone-400">/ 100</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                        High Compatibility
                      </span>
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50/70 p-3.5 rounded-2xl border border-stone-100">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Net Quantity</span>
                      <span className="font-bold text-stone-800">
                        {match.donation.quantityKg} kg ({match.donation.estimatedMeals} meals)
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Holding Condition</span>
                      <span className="font-bold text-stone-800 capitalize">
                        {match.donation.storageCondition.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Safe Collection Window</span>
                      <span className="font-bold text-amberGold-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Next 2 Hours
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Allergens Tagged</span>
                      <span className="font-bold text-stone-800">
                        {match.donation.allergens.length > 0 ? match.donation.allergens.join(', ') : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Heuristic Breakdown Explanation */}
                  <div className="text-xs text-stone-600 space-y-1">
                    <p className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                      Stage 2 Explainable Scoring Breakdown:
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Distance (35%): <strong>{match.scoreBreakdown.distanceScore} pts</strong> &bull; 
                      Urgency (30%): <strong>{match.scoreBreakdown.urgencyScore} pts</strong> &bull; 
                      Capacity (20%): <strong>{match.scoreBreakdown.capacityScore} pts</strong> &bull; 
                      Reliability (15%): <strong>{match.scoreBreakdown.reliabilityScore} pts</strong>
                    </p>
                  </div>

                  {/* Accept / Decline Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
                    <p className="text-[11px] text-stone-500">
                      Atomic acceptance locks this batch and routes a volunteer courier with insulated bags.
                    </p>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeclineMatch(match.id)}
                      >
                        Decline Offer
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleAcceptMatch(match)}
                        leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                      >
                        Accept Donation for Dinner Service
                      </Button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
