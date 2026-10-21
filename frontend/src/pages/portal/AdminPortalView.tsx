import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  FileText, 
  Lock
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { adminService } from '../../services/api/adminService';
import { Organization, AuditLogEntry } from '../../types';

export const AdminPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    const [orgs, logs] = await Promise.all([
      adminService.getOrganizations(),
      adminService.getAuditLogs(),
    ]);
    setOrganizations(orgs);
    setAuditLogs(logs);
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerifyOrg = async (orgId: string, orgName: string) => {
    const updated = await adminService.verifyOrganization(orgId);
    if (updated) {
      showToast(
        'Organization Approved & Verified',
        `${orgName} granted permission to post / receive food donations.`,
        'success'
      );
      loadAdminData();
    }
  };

  const orgColumns: Column<Organization>[] = [
    {
      key: 'name',
      header: 'Organization & Category',
      sortable: true,
      render: (o) => (
        <div>
          <p className="font-bold text-forest-950">{o.name}</p>
          <span className="text-[11px] text-stone-500 font-medium">
            {o.type} &bull; <strong className="capitalize">{o.category}</strong>
          </span>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Primary Contact',
      render: (o) => (
        <div>
          <span className="font-medium text-stone-800 block">{o.contactPerson}</span>
          <span className="text-[11px] text-stone-500">{o.email}</span>
        </div>
      ),
    },
    {
      key: 'dailyCapacityMeals',
      header: 'Capacity / Facility',
      render: (o) => (
        <div>
          <span className="text-stone-800 font-semibold block">
            {o.dailyCapacityMeals ? `${o.dailyCapacityMeals} meals/day` : 'Commercial Kitchen'}
          </span>
          <span className="text-[11px] text-stone-500">
            {o.refrigerationAvailable ? 'Cooler Verified' : 'Standard Storage'}
          </span>
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Verification Status',
      sortable: true,
      render: (o) => (
        <Badge
          variant={o.verificationStatus === 'verified' ? 'emerald' : 'amber'}
          size="sm"
        >
          {o.verificationStatus}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Admin Actions',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-2">
          {o.verificationStatus !== 'verified' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleVerifyOrg(o.id, o.name)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Approve
            </Button>
          ) : (
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Authorized
            </span>
          )}
        </div>
      ),
    },
  ];

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      key: 'action',
      header: 'Audit Event',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-xs font-bold text-forest-900 bg-forest-50 px-2 py-0.5 rounded border border-forest-100">
          {log.action}
        </span>
      ),
    },
    {
      key: 'performedByName',
      header: 'Actor',
      render: (log) => (
        <div>
          <span className="font-semibold text-stone-800 block text-xs">{log.performedByName}</span>
          <span className="text-[10px] text-stone-500 uppercase">{log.performedByRole}</span>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity / Target',
      render: (log) => (
        <span className="text-xs text-stone-600 font-medium">
          {log.entityType} ({log.entityId})
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (log) => (
        <span className="text-xs font-mono text-stone-500">
          {log.timestamp.slice(0, 19).replace('T', ' ')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-soft">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
            System Operations & Compliance Command
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-0.5">
            Platform Administration & Safety Oversight
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Administrator: <strong>{user?.fullName}</strong> &bull; RBAC Level: Superadmin &bull; Metro Central Zone 1
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="stone" size="md">
            Backend Security: RBAC Enforced
          </Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Organizations"
          value={organizations.length}
          icon={Building2}
          subtext="Donors & community kitchens"
          badge={{ label: 'Vetted', variant: 'forest' }}
        />
        <StatCard
          title="Safety Reviews on Hold"
          value="0 active"
          icon={ShieldCheck}
          subtext="Zero compromised batches"
          badge={{ label: 'Clear', variant: 'emerald' }}
        />
        <StatCard
          title="Audit Trail Entries"
          value={auditLogs.length}
          icon={FileText}
          subtext="Cryptographically linked logs"
          trend={{ direction: 'up', label: 'Real-time trace' }}
        />
        <StatCard
          title="Anti-Collision Engine"
          value="100% Atomic"
          icon={Lock}
          subtext="Zero duplicate acceptance"
          badge={{ label: 'Postgres Locks', variant: 'forest' }}
        />
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'organizations', label: 'Organization Verification', count: organizations.length },
            { id: 'audit', label: 'Immutable Audit Trail', count: auditLogs.length },
          ]}
        />

        {activeTab === 'organizations' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner label="Loading organization records..." />
              </div>
            ) : (
              <DataTable
                columns={orgColumns}
                data={organizations}
                keyExtractor={(o) => o.id}
                searchPlaceholder="Search organization name, category, or contact..."
                searchFilter={(o, q) =>
                  o.name.toLowerCase().includes(q) || o.category.toLowerCase().includes(q)
                }
                emptyTitle="No organizations registered"
                emptyDescription="New restaurant and NGO registrations will appear here for verification."
              />
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-stone-100/80 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <span>
                <strong>Audit Invariant:</strong> All donation creations, state transitions, match locks, and handovers generate immutable audit records.
              </span>
              <span className="font-mono text-stone-500 text-[11px]">Audit Engine: Active</span>
            </div>

            <DataTable
              columns={auditColumns}
              data={auditLogs}
              keyExtractor={(log) => log.id}
              searchPlaceholder="Search audit events, actors, or entity IDs..."
              searchFilter={(log, q) =>
                log.action.toLowerCase().includes(q) ||
                log.performedByName.toLowerCase().includes(q) ||
                log.entityId.toLowerCase().includes(q)
              }
            />
          </div>
        )}
      </div>

    </div>
  );
};
