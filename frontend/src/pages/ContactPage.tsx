import React, { useState } from 'react';
import { 
  Mail, 
  PhoneCall, 
  MapPin, 
  ShieldAlert, 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FAQS } from '../data/mockData';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    topic: 'general',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      
      {/* HEADER */}
      <div className="max-w-3xl space-y-4">
        <Badge variant="forest">Connect with LastPlate</Badge>
        <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-forest-950 tracking-tight">
          We&apos;re Here to Help Rescue More Food
        </h1>
        <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
          Questions about food donor compliance, NGO verification, volunteer courier shifts, or technical integration? Reach out to our local metro operations team.
        </p>
      </div>

      {/* EMERGENCY FOOD SAFETY HOTLINE CALLOUT */}
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>24/7 Food Safety Emergency & Quarantine Line</span>
          </div>
          <p className="text-xs sm:text-sm text-rose-900 leading-relaxed">
            For receiving kitchens reporting immediate thermal compromise or safety concerns with an active handover.
          </p>
        </div>
        <div className="shrink-0">
          <a
            href="tel:+18005278752"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs sm:text-sm transition-colors shadow-soft"
          >
            <PhoneCall className="w-4 h-4" />
            1-800-LAST-PLATE (527-8752)
          </a>
        </div>
      </div>

      {/* CONTACT GRID: FORM & DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Form Column */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-3xl border border-stone-200 shadow-soft space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="font-serif text-2xl font-bold text-forest-950">
              Send an Inquiry or Verification Request
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Our community dispatch coordinator responds within 4 business hours.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 rounded-2xl bg-forest-50 border border-forest-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-forest-800 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </div>
              <h3 className="font-bold text-forest-950 text-lg">Inquiry Received!</h3>
              <p className="text-xs sm:text-sm text-stone-700 max-w-md mx-auto">
                Thank you, <strong>{formData.name}</strong>. A LastPlate coordinator has been assigned to your ticket ({formData.topic}). We will contact you at <strong>{formData.email}</strong> shortly.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', organization: '', topic: 'general', message: '' });
                  }}
                >
                  Send Another Message
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@organization.org"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Organization / Business (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g. Hearthside Bistro or Hope Shelter"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Topic of Inquiry *
                  </label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700 bg-white"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="donor_onboarding">Food Donor Registration & Safe Harbor</option>
                    <option value="ngo_verification">NGO & Community Kitchen Verification</option>
                    <option value="volunteer_courier">Volunteer Courier Network</option>
                    <option value="api_tech">Technical Integration / API</option>
                    <option value="press">Press & Media</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we assist your food rescue operations?"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                ></textarea>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  rightIcon={<Send className="w-4 h-4" />}
                >
                  Send Message to Operations
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Operating Hub Details Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-cream-100 p-6 sm:p-8 rounded-3xl border border-[#E7DFD5] space-y-5">
            <h3 className="font-serif text-xl font-bold text-forest-950">
              Metro Launch Operations Hub
            </h3>
            
            <div className="space-y-4 text-xs sm:text-sm text-stone-700">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-forest-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">Physical Dispatch & Training Hub</p>
                  <p className="text-stone-600 text-xs">450 Urban Harvest Plaza, Suite 200, Metro Central Zone</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Thermal bag pickups available M-F 08:00 - 18:00</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-forest-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">Direct Email Dispatch</p>
                  <p className="text-stone-600 text-xs">operations@lastplate.org</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Automated ticketing & priority routing</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-forest-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">Operating Hours</p>
                  <p className="text-stone-600 text-xs">Platform: 24/7 Automated AI Matching</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Live Staff Support: 06:00 - 23:00 Daily</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <h4 className="font-bold text-forest-950 text-sm">
              Press & Community Partnerships
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              We collaborate with municipal sustainability departments, culinary institutes, and regional food waste task forces. Contact <strong>partnerships@lastplate.org</strong> for collaborative studies or city expansion inquiries.
            </p>
          </div>
        </div>

      </div>

      {/* ACCORDION FAQ */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="stone">Help Center</Badge>
          <h2 className="font-serif text-3xl font-bold text-forest-950">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
                >
                  <span className="font-bold text-forest-950 text-sm sm:text-base flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-forest-700 shrink-0" />
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-stone-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-stone-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 bg-[#FAF8F5]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
