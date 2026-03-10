import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import BorderAnimatedContainer from '../components/BorderAnimatedContainer'
import { MessageCircleCheckIcon, LockIcon, MailIcon, UserIcon, LoaderIcon } from 'lucide-react'
import { Link } from 'react-router'

function SignUpPage() {
  const [formData, setFormData] = useState({fullName: "", email:"", password: ""})
  const {signUp, isSigningUp} = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault();
    await signUp(formData);
  };

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-6xl md:h-[800px] h-[650px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row" >
            {/* FORM COLUMN - LEFT SIDE */}
            <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30">
              <div className="w-full max-w-md">
                
                {/* HEADING TEXT*/}
                <div className="text-center mb-8">
                  <MessageCircleCheckIcon className="w-12 h-12 mx-auto text-slate-400 mb-4"/>
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">Create Account</h2>
                  <p className="text-slate-400">Sign up for a new account</p>
                </div>

                {/* SIGNUP FORM */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* FULL NAME */}
                  <div>
                    <label className="auth-input-label">Full Name</label>
                    <div className="relative">
                      <UserIcon className="auth-input-icon" />
                      
                      <input type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value })}
                        className="input"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="auth-input-label">Email</label>
                    <div className="relative">
                      <MailIcon className="auth-input-icon" />

                      <input type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value })}
                        className="input"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <label className="auth-input-label">Password</label>
                    <div className="relative">
                      <LockIcon className="auth-input-icon" />
                      <input type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value })}
                        className="input"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button className="auth-btn" type="submit" disabled={isSigningUp}>
                    {isSigningUp ? (
                      <LoaderIcon className="w-full h-5 animate-spin text-center"/>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="auth-link">
                    Already have an account? Sign in
                  </Link>
                </div>
              </div>
            </div>

            {/* IMAGE COLUMN - RIGHT SIDE */}
            <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <div>
                <img 
                  src="/signup.gif"
                  alt="Sign Up Illustration"
                  className="w-2/3 h-auto object-contain mx-auto"
                />
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
  )
}

export default SignUpPage