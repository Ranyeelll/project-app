import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  FileTextIcon,
  MapPinIcon,
  UsersIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  TargetIcon,
  PencilIcon,
} from 'lucide-react';
import { useData, useAuth, useNavigation } from '../../context/AppContext';
import { apiFetch } from '../../utils/apiFetch';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const STEPS = [
  { label: 'Project Information', icon: FileTextIcon },
  { label: 'Stakeholders', icon: UsersIcon },
  { label: 'Timeline & Budget', icon: CalendarIcon },
  { label: 'Team Assignment', icon: UsersIcon },
  { label: 'Review & Submit', icon: CheckCircle2Icon },
] as const;

const CATEGORY_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'research', label: 'Research' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'consultation', label: 'Consultation' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const RISK_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const BENEFICIARY_OPTIONS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
];

interface FormData {
  // Step 1
  name: string;
  description: string;
  category: string;
  priority: string;
  riskLevel: string;
  // Step 2
  beneficiaryType: string;
  beneficiaryName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  objectives: string;
  // Step 3
  startDate: string;
  endDate: string;
  budget: string;
  // Step 4
  teamIds: string[];
  leaderId: string;
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

export function CreateProjectPage() {
  const { setCurrentPage } = useNavigation();
  const { users, refreshProjects } = useData();
  const { currentUser } = useAuth();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsPageLoading(false);
    }
  }, [users]);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    category: 'development',
    priority: 'medium',
    riskLevel: 'low',
    beneficiaryType: 'internal',
    beneficiaryName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    location: '',
    objectives: '',
    startDate: '',
    endDate: '',
    budget: '',
    teamIds: [],
    leaderId: '',
  });

  const [serialPreview] = useState(() => {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, '0');
    return `MAP-${year}-${randomDigits}`;
  });

  const selectedTeamMembers = useMemo(
    () => users.filter((u) => form.teamIds.includes(u.id)),
    [users, form.teamIds]
  );

  const allTeamMembers = useMemo(
    () => users.filter((u) => u.role === 'employee' && u.status === 'active'),
    [users]
  );

  const [teamSearch, setTeamSearch] = useState('');
  const filteredTeamMembers = useMemo(
    () =>
      teamSearch.trim()
        ? allTeamMembers.filter((u) =>
            u.name.toLowerCase().includes(teamSearch.toLowerCase())
          )
        : allTeamMembers,
    [allTeamMembers, teamSearch]
  );

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  // Per-step validation
  const validateStep = (step: number): boolean => {
    const errors: FieldErrors = {};

    if (step === 0) {
      if (!form.name.trim()) errors.name = 'Project name is required.';
      if (!form.description.trim()) errors.description = 'Description is required.';
    }

    if (step === 1) {
      if (!form.beneficiaryName.trim()) errors.beneficiaryName = 'Beneficiary name is required.';
      if (!form.objectives.trim()) errors.objectives = 'Objectives are required.';
      if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
        errors.contactEmail = 'Please enter a valid email address.';
      }
    }

    if (step === 2) {
      if (!form.startDate) errors.startDate = 'Start date is required.';
      if (!form.endDate) errors.endDate = 'End date is required.';
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        errors.endDate = 'End date cannot be earlier than start date.';
      }
      if (form.budget) {
        const budget = Number(form.budget);
        if (Number.isNaN(budget) || budget < 0) {
          errors.budget = 'Budget must be a valid non-negative number.';
        }
      }
    }

    if (step === 3) {
      if (form.teamIds.length === 0) {
        errors.teamIds = 'Select at least one team member.';
      }
      if (form.teamIds.length >= 2 && !form.leaderId) {
        errors.leaderId = 'Select a project leader when assigning 2 or more team members.';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please complete the required fields.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setError('');
    setFieldErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setError('');
      setFieldErrors({});
      setCurrentStep(step);
    }
  };

  const handleSubmit = async () => {
    // Validate all steps
    for (let i = 0; i < 4; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          status: 'active',
          priority: form.priority,
          category: form.category,
          risk_level: form.riskLevel,
          beneficiary_type: form.beneficiaryType,
          beneficiary_name: form.beneficiaryName,
          contact_person: form.contactPerson || null,
          contact_email: form.contactEmail || null,
          contact_phone: form.contactPhone || null,
          location: form.location || null,
          objectives: form.objectives,
          start_date: form.startDate || null,
          end_date: form.endDate || null,
          budget: form.budget ? Number(form.budget) : null,
          manager_id: currentUser?.id || null,
          team_ids: form.teamIds,
          leader_id: form.leaderId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const apiErrors = data?.errors || {};
        const mappedErrors: FieldErrors = {
          name: apiErrors.name?.[0],
          description: apiErrors.description?.[0],
          startDate: apiErrors.start_date?.[0],
          endDate: apiErrors.end_date?.[0],
          budget: apiErrors.budget?.[0],
          leaderId: apiErrors.leader_id?.[0],
          beneficiaryName: apiErrors.beneficiary_name?.[0],
          objectives: apiErrors.objectives?.[0],
          contactEmail: apiErrors.contact_email?.[0],
        };
        setFieldErrors(mappedErrors);
        throw new Error(data.message || 'Failed to create project');
      }

      await refreshProjects();
      setCurrentPage('admin-projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPage('admin-projects');
  };

  const durationDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }, [form.startDate, form.endDate]);

  const leaderName = useMemo(
    () => selectedTeamMembers.find((u) => u.id === form.leaderId)?.name || 'Not selected',
    [selectedTeamMembers, form.leaderId]
  );

  const labelFor = (value: string, options: { value: string; label: string }[]) =>
    options.find((o) => o.value === value)?.label || value;

  // ─── Step Content Renderers ──────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      <Input
        label="Project Name *"
        placeholder="e.g. GIS Platform Upgrade"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        error={fieldErrors.name}
      />
      <Textarea
        label="Description *"
        placeholder="Describe the project objectives, scope, and expected outcomes..."
        value={form.description}
        onChange={(e) => updateField('description', e.target.value)}
        error={fieldErrors.description}
        rows={4}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Category *"
          value={form.category}
          onChange={(e) => updateField('category', e.target.value)}
          options={CATEGORY_OPTIONS}
        />
        <Select
          label="Priority *"
          value={form.priority}
          onChange={(e) => updateField('priority', e.target.value)}
          options={PRIORITY_OPTIONS}
        />
        <Select
          label="Risk Level *"
          value={form.riskLevel}
          onChange={(e) => updateField('riskLevel', e.target.value)}
          options={RISK_OPTIONS}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Beneficiary Type *"
          value={form.beneficiaryType}
          onChange={(e) => updateField('beneficiaryType', e.target.value)}
          options={BENEFICIARY_OPTIONS}
        />
        <Input
          label="Beneficiary Name *"
          placeholder={form.beneficiaryType === 'internal' ? 'e.g. Accounting Department' : 'e.g. ABC Corporation'}
          value={form.beneficiaryName}
          onChange={(e) => updateField('beneficiaryName', e.target.value)}
          error={fieldErrors.beneficiaryName}
        />
      </div>
      <Input
        label="Contact Person"
        placeholder="e.g. John Doe"
        value={form.contactPerson}
        onChange={(e) => updateField('contactPerson', e.target.value)}
        icon={<UserIcon size={14} />}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Contact Email"
          type="email"
          placeholder="e.g. john@example.com"
          value={form.contactEmail}
          onChange={(e) => updateField('contactEmail', e.target.value)}
          error={fieldErrors.contactEmail}
          icon={<MailIcon size={14} />}
        />
        <Input
          label="Contact Phone"
          placeholder="e.g. +63 917 123 4567"
          value={form.contactPhone}
          onChange={(e) => updateField('contactPhone', e.target.value)}
          icon={<PhoneIcon size={14} />}
        />
      </div>
      <Input
        label="Location / Address"
        placeholder="e.g. 123 Rizal Ave, Makati City"
        value={form.location}
        onChange={(e) => updateField('location', e.target.value)}
        icon={<MapPinIcon size={14} />}
      />
      <Textarea
        label="Objectives *"
        placeholder="What does success look like for this project?"
        value={form.objectives}
        onChange={(e) => updateField('objectives', e.target.value)}
        error={fieldErrors.objectives}
        rows={4}
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Start Date *"
          type="date"
          value={form.startDate}
          onChange={(e) => updateField('startDate', e.target.value)}
          error={fieldErrors.startDate}
        />
        <Input
          label="End Date *"
          type="date"
          value={form.endDate}
          onChange={(e) => updateField('endDate', e.target.value)}
          error={fieldErrors.endDate}
        />
      </div>
      {durationDays !== null && (
        <p className="text-sm dark:text-dark-muted text-light-muted">
          Duration: <span className="font-medium dark:text-dark-text text-light-text">{durationDays} day{durationDays !== 1 ? 's' : ''}</span>
        </p>
      )}
      <Input
        label="Budget (PHP)"
        type="number"
        placeholder="e.g. 250000"
        value={form.budget}
        onChange={(e) => updateField('budget', e.target.value)}
        icon={<DollarSignIcon size={14} />}
        error={fieldErrors.budget}
        hint="Optional. Leave blank if budget is not yet finalized."
      />
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      {fieldErrors.teamIds && (
        <p className="text-sm text-red-400">{fieldErrors.teamIds}</p>
      )}
      <div className="relative">
        <Input
          placeholder="Search employees..."
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
        />
      </div>
      <div className="space-y-1 max-h-80 overflow-y-auto dark:bg-dark-bg bg-gray-50 rounded-lg border dark:border-dark-border border-light-border p-3">
        {filteredTeamMembers.length === 0 ? (
          <div className="py-8 text-center dark:text-dark-subtle text-light-subtle">
            <UsersIcon size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No team members found</p>
          </div>
        ) : (
          filteredTeamMembers.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:dark:bg-dark-card2/50 hover:bg-white cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={form.teamIds.includes(u.id)}
                onChange={(e) => {
                  setForm((prev) => {
                    const nextTeamIds = e.target.checked
                      ? [...prev.teamIds, u.id]
                      : prev.teamIds.filter((id) => id !== u.id);
                    return {
                      ...prev,
                      teamIds: nextTeamIds,
                      leaderId: nextTeamIds.includes(prev.leaderId) ? prev.leaderId : '',
                    };
                  });
                  if (fieldErrors.teamIds) setFieldErrors((prev) => ({ ...prev, teamIds: undefined }));
                }}
                className="rounded border-gray-400 text-green-primary focus:ring-green-primary cursor-pointer"
              />
              <UserAvatar
                name={u.name}
                avatarText={u.avatar}
                profilePhoto={u.profilePhoto}
                className="w-7 h-7"
                textClassName="text-xs font-bold text-black"
                fallbackStyle={{ backgroundColor: '#63D44A' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm dark:text-dark-text text-light-text truncate font-medium">{u.name}</p>
                <p className="text-xs dark:text-dark-subtle text-light-subtle truncate">{u.position}</p>
              </div>
            </label>
          ))
        )}
      </div>
      <p className="text-sm dark:text-dark-muted text-light-muted">
        {form.teamIds.length} member{form.teamIds.length !== 1 ? 's' : ''} selected
      </p>

      {form.teamIds.length >= 2 && (
        <div>
          <Select
            label="Project Leader *"
            value={form.leaderId}
            onChange={(e) => updateField('leaderId', e.target.value)}
            error={fieldErrors.leaderId}
            options={[
              { value: '', label: 'Select leader from assigned team' },
              ...selectedTeamMembers.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
            Only the selected leader can update project progress when this project has multiple members.
          </p>
        </div>
      )}
    </div>
  );

  const SummaryCard = ({
    title,
    icon: Icon,
    step,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    step: number;
    children: React.ReactNode;
  }) => (
    <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-green-500" />
          <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">{title}</h3>
        </div>
        <button
          onClick={() => goToStep(step)}
          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-500 transition-colors"
        >
          <PencilIcon size={12} />
          Edit
        </button>
      </div>
      {children}
    </div>
  );

  const SummaryRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex justify-between py-1">
      <span className="text-xs dark:text-dark-subtle text-light-subtle">{label}</span>
      <span className="text-sm font-medium dark:text-dark-text text-light-text text-right max-w-[60%] truncate">
        {value || '—'}
      </span>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard title="Project Information" icon={FileTextIcon} step={0}>
          <div className="space-y-1">
            <SummaryRow label="Name" value={form.name} />
            <SummaryRow label="Category" value={labelFor(form.category, CATEGORY_OPTIONS)} />
            <SummaryRow label="Priority" value={labelFor(form.priority, PRIORITY_OPTIONS)} />
            <SummaryRow label="Risk Level" value={labelFor(form.riskLevel, RISK_OPTIONS)} />
          </div>
        </SummaryCard>

        <SummaryCard title="Stakeholders" icon={TargetIcon} step={1}>
          <div className="space-y-1">
            <SummaryRow label="Type" value={labelFor(form.beneficiaryType, BENEFICIARY_OPTIONS)} />
            <SummaryRow label="Name" value={form.beneficiaryName} />
            <SummaryRow label="Contact" value={form.contactPerson} />
            <SummaryRow label="Email" value={form.contactEmail} />
            <SummaryRow label="Phone" value={form.contactPhone} />
            <SummaryRow label="Location" value={form.location} />
          </div>
        </SummaryCard>

        <SummaryCard title="Timeline & Budget" icon={CalendarIcon} step={2}>
          <div className="space-y-1">
            <SummaryRow label="Start Date" value={form.startDate ? new Date(form.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null} />
            <SummaryRow label="End Date" value={form.endDate ? new Date(form.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null} />
            <SummaryRow label="Duration" value={durationDays !== null ? `${durationDays} day${durationDays !== 1 ? 's' : ''}` : null} />
            <SummaryRow label="Budget" value={form.budget ? `₱${Number(form.budget).toLocaleString()}` : 'Not set'} />
          </div>
        </SummaryCard>

        <SummaryCard title="Team Assignment" icon={UsersIcon} step={3}>
          <div className="space-y-2">
            <p className="text-xs dark:text-dark-subtle text-light-subtle">Members ({form.teamIds.length})</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {selectedTeamMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <UserAvatar
                    name={m.name}
                    avatarText={m.avatar}
                    profilePhoto={m.profilePhoto}
                    className="w-5 h-5"
                    textClassName="text-[8px] font-bold text-black"
                    fallbackStyle={{ backgroundColor: '#63D44A' }}
                  />
                  <span className="text-sm dark:text-dark-text text-light-text">{m.name}</span>
                  {m.id === form.leaderId && (
                    <span className="text-xs text-green-500 font-medium">⭐ Leader</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </SummaryCard>
      </div>

      {/* Description + Objectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-5">
          <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">📝 Description</h3>
          <p className="text-sm dark:text-dark-muted text-light-muted whitespace-pre-wrap">{form.description || '—'}</p>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-5">
          <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">🎯 Objectives</h3>
          <p className="text-sm dark:text-dark-muted text-light-muted whitespace-pre-wrap">{form.objectives || '—'}</p>
        </div>
      </div>
    </div>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  if (isPageLoading) return <LoadingSpinner message="Loading project wizard..." />;

  return (
    <div className="w-full pb-8">
      {/* Hero Header */}
      <div className="bg-gray-50 dark:bg-dark-bg border-b border-light-border">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-dark-text text-gray-900 tracking-tight">
            Create Project
          </h1>
          <p className="text-sm text-green-600 mt-1">Maptech Information Solutions Inc.</p>

          <div className="mt-4 flex justify-center">
            <div className="bg-white dark:bg-dark-card border border-light-border rounded-full px-3 py-1.5 flex items-center gap-3 shadow-sm">
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-card2 transition-colors"
                title="Back to projects"
              >
                <ArrowLeftIcon size={14} className="dark:text-dark-muted text-light-muted" />
              </button>
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon size={14} className="text-green-500" />
                <span className="text-xs text-gray-600 dark:text-dark-subtle">Date:</span>
                <span className="font-medium text-sm dark:text-dark-text">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="h-6 w-px bg-gray-200 dark:bg-dark-border mx-2" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-gray-600 dark:text-dark-subtle">Project No.:</span>
                <span className="font-mono text-sm font-semibold text-green-700 dark:text-green-400">
                  {serialPreview}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-2">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;
            const isClickable = i < currentStep;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => isClickable && goToStep(i)}
                    disabled={!isClickable}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                        : isActive
                        ? 'bg-green-500 text-white ring-4 ring-green-500/20'
                        : 'bg-gray-200 dark:bg-dark-border text-gray-500 dark:text-dark-muted cursor-default'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2Icon size={18} /> : i + 1}
                  </button>
                  <span
                    className={`text-xs font-medium text-center max-w-[80px] leading-tight ${
                      isActive || isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'dark:text-dark-muted text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                      i < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-dark-border'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-4 rounded-lg dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 bg-red-50 border border-red-200 text-red-600">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold dark:text-dark-text text-light-text mb-1">
              {STEPS[currentStep].label}
            </h2>
            <p className="text-sm dark:text-dark-subtle text-light-subtle">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>

          {stepContent[currentStep]()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 0 ? (
              <Button variant="secondary" onClick={handlePrevious}>
                ← Previous
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
          <div>
            {currentStep < 4 ? (
              <Button variant="primary" onClick={handleNext}>
                Next →
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} loading={loading}>
                🚀 Create Project
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
