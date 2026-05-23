import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signupUser, verifyOtp, loginUser } from '../services/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    otp: ''
  });
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (showOtp) {
        const res = await verifyOtp({ email: formData.email, otp: formData.otp });
        login(res.user, res.token);
        toast.success(res.message);
        navigate('/workspace');
      } else if (isLogin) {
        try {
          const res = await loginUser({ email: formData.email, password: formData.password });
          login(res.user, res.token);
          toast.success('Logged in successfully');
          navigate('/workspace');
        } catch (err) {
          if (err.message.includes('not verified')) {
            toast.error(err.message);
            setShowOtp(true);
          } else {
            throw err;
          }
        }
      } else {
        const res = await signupUser({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
        toast.success(res.message);
        setShowOtp(true);
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="au-root">
      <div className="au-aurora">
        <div className="au-orb au-orb-1" />
        <div className="au-orb au-orb-2" />
      </div>

      <div className="au-card">
        <div className="au-header">
          <h1>Apollo</h1>
          <p>{showOtp ? 'Verify Your Account' : isLogin ? 'Welcome Back' : 'Join Apollo'}</p>
        </div>

        <form onSubmit={handleSubmit} className="au-form">
          {showOtp ? (
            <>
              <div className="au-input-group">
                <ShieldCheck className="icon" />
                <input
                  type="text"
                  name="otp"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <p className="au-otp-hint">We sent a verification code to {formData.email}</p>
            </>
          ) : (
            <>
              {!isLogin && (
                <div className="au-input-group">
                  <UserIcon className="icon" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required={!isLogin}
                  />
                </div>
              )}
              
              <div className="au-input-group">
                <Mail className="icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="au-input-group">
                <Lock className="icon" />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="au-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : showOtp ? 'Verify OTP' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {!showOtp && (
          <div className="au-footer">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                type="button" 
                className="au-toggle-btn"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
