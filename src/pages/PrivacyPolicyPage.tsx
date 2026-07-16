import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full pt-12 pb-24 px-4 sm:px-6">
      <div className="text-center mb-12">
        <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-slate-400 text-lg">Last updated: July 2026</p>
      </div>

      <div className="card w-full p-8 md:p-12 prose prose-invert prose-slate max-w-none">
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Introduction</h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          Welcome to ProManager ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you as to how we look after your personal data when you visit our website or use our mobile application (the "App") and tell you about your privacy rights and how the law protects you.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. The Data We Collect About You</h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
        </p>
        <ul className="list-disc pl-6 text-slate-300 mb-6 space-y-2">
          <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
          <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
          <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
          <li><strong>Usage Data</strong> includes information about how you use our App, tournaments, and services.</li>
        </ul>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. How We Use Your Personal Data</h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
        </p>
        <ul className="list-disc pl-6 text-slate-300 mb-6 space-y-2">
          <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., managing a tournament).</li>
          <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
          <li>Where we need to comply with a legal obligation.</li>
        </ul>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Data Security</h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Your Legal Rights</h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
        </p>

        <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Contact Us</h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          If you have any questions about this Privacy Policy or our privacy practices, please contact us at support@promanager.com.
        </p>
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="btn btn-outline text-slate-400 hover:text-white">
          Return to Hub
        </Link>
      </div>
    </div>
  );
}
