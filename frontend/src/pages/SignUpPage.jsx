import { LoaderIcon, LockIcon, MailIcon, MessageCircleCheckIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { useAuthStore } from "../store/useAuthStore";

function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const { signUp, isSigningUp } = useAuthStore();

  const handleSubmit = async (event) => {
    event.preventDefault();
    await signUp(formData);
  };

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-6xl md:h-[800px] h-[650px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row">
            <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30">
              <div className="w-full max-w-md">
                <div className="text-center mb-8">
                  <MessageCircleCheckIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">Create Account</h2>
                  <p className="text-slate-400">Sign up for a new account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="auth-input-label">Full Name</label>
                    <div className="relative">
                      <UserIcon className="auth-input-icon" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                        className="input"
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={80}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="auth-input-label">Email</label>
                    <div className="relative">
                      <MailIcon className="auth-input-icon" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                        className="input"
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                        maxLength={254}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="auth-input-label">Password</label>
                    <div className="relative">
                      <LockIcon className="auth-input-icon" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                        className="input"
                        placeholder="Enter your password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={72}
                      />
                    </div>
                  </div>

                  <button className="auth-btn" type="submit" disabled={isSigningUp}>
                    {isSigningUp ? <LoaderIcon className="w-full h-5 animate-spin text-center" /> : "Create Account"}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="auth-link">
                    Already have an account? Sign in
                  </Link>
                </div>
              </div>
            </div>

            <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <div>
                <img src="/signup.gif" alt="Sign Up Illustration" className="w-2/3 h-auto object-contain mx-auto" />
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-medium text-cyan-400">Welcome to Chatify!</h3>
                  <div className="mt-4 flex justify-center gap-4">
                    <span className="auth-badge">Free</span>
                    <span className="auth-badge">Easy</span>
                    <span className="auth-badge">Connect</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}

export default SignUpPage;