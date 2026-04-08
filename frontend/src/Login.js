import React, { useState, useEffect } from 'react';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (isSignUp && !name) {
      setError('Please enter your full name.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    // Simulate network delay for realistic UX
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    onLogin({ name: name || email.split('@')[0], email });
  };

  const toggleMode = () => {
    setIsSignUp((p) => !p);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div style={styles.page}>
      {/* Animated background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />

      {/* Glass card */}
      <div style={{ ...styles.card, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(28px)' }}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>🗺</div>
          <span style={styles.brandName}>Tourist Buddy</span>
        </div>

        <h1 style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
        <p style={styles.subtitle}>
          {isSignUp
            ? 'Join thousands of explorers discovering India'
            : 'Your AI-powered travel companion awaits'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {isSignUp && (
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Sharma"
                style={styles.input}
                autoComplete="name"
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>⚠</span> {error}
            </div>
          )}

          {!isSignUp && (
            <div style={styles.forgotRow}>
              <span style={styles.forgotLink}>Forgot password?</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.submitBtn,
              background: hoveredBtn
                ? 'linear-gradient(135deg, #00c853 0%, #00e676 100%)'
                : 'linear-gradient(135deg, #00e676 0%, #69f0ae 100%)',
              transform: hoveredBtn ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredBtn
                ? '0 12px 32px rgba(0, 230, 118, 0.45)'
                : '0 6px 20px rgba(0, 230, 118, 0.3)',
            }}
            onMouseEnter={() => setHoveredBtn(true)}
            onMouseLeave={() => setHoveredBtn(false)}
          >
            {isLoading ? (
              <span style={styles.spinner}>●◌○</span>
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Google SSO placeholder */}
        <button style={styles.googleBtn}>
          <span style={styles.googleIcon}>🌐</span> Continue with Google
        </button>

        {/* Toggle */}
        <p style={styles.toggleText}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <span style={styles.toggleLink} onClick={toggleMode}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </span>
        </p>

        {/* Footer note */}
        <p style={styles.footerNote}>
          Powered by Apache Spark · HDFS · Groq LLM · FAISS
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 35px) scale(1.08); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 20px) scale(0.95); }
        }
        @keyframes spin {
          0% { opacity: 1; } 33% { opacity: 0.4; } 66% { opacity: 0.1; } 100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #0a1628 40%, #0d1f0d 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  orb1: {
    position: 'absolute',
    top: '-120px',
    left: '-120px',
    width: '480px',
    height: '480px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,230,118,0.18) 0%, transparent 70%)',
    animation: 'float1 8s ease-in-out infinite',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute',
    bottom: '-80px',
    right: '-80px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(102,126,234,0.2) 0%, transparent 70%)',
    animation: 'float2 10s ease-in-out infinite',
    pointerEvents: 'none',
  },
  orb3: {
    position: 'absolute',
    top: '50%',
    left: '60%',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,200,83,0.1) 0%, transparent 70%)',
    animation: 'float3 7s ease-in-out infinite',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255, 255, 255, 0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '40px 36px 32px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  brandIcon: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #00e676 0%, #69f0ae 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 4px 12px rgba(0,230,118,0.3)',
  },
  brandName: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '-0.5px',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: '28px',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '15px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit',
    width: '100%',
  },
  errorBox: {
    background: 'rgba(244,67,54,0.12)',
    border: '1px solid rgba(244,67,54,0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#ef9a9a',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorIcon: {
    fontSize: '14px',
  },
  forgotRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '-6px',
  },
  forgotLink: {
    fontSize: '12px',
    color: 'rgba(0,230,118,0.7)',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  submitBtn: {
    marginTop: '4px',
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#0d1a0d',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
    letterSpacing: '-0.2px',
    fontFamily: 'inherit',
  },
  spinner: {
    display: 'inline-block',
    letterSpacing: '4px',
    animation: 'spin 1.2s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.5px',
  },
  googleBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.2s, border-color 0.2s',
    fontFamily: 'inherit',
    marginBottom: '20px',
  },
  googleIcon: { fontSize: '16px' },
  toggleText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginBottom: '20px',
  },
  toggleLink: {
    color: '#00e676',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'color 0.2s',
  },
  footerNote: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.18)',
    textAlign: 'center',
    letterSpacing: '0.3px',
    lineHeight: '1.6',
  },
};

export default Login;
