import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerParticipant } from '../services/participantService';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '', email: '', password: '', mobileNumber: '', dob: ''
    });
    const [message, setMessage] = useState('');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const validateRegisterField = (field: string, value: string) => {
        if (field === 'fullName' && !value.trim()) return 'Full name is required.';
        if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.';
        if (field === 'password' && value.length < 8) return 'Password must be at least 8 characters long.';
        if (field === 'mobileNumber' && !value.trim()) return 'Mobile number is required.';
        if (field === 'dob') {
            if (!value) return 'Date of birth is required.';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(`${value}T00:00:00`);
            if (selectedDate > today) return 'Date of birth cannot be in the future.';
        }
        return '';
    };

    const handleRegisterBlur = (field: string, value: string) => {
        setValidationErrors((current) => ({ ...current, [field]: validateRegisterField(field, value) }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await registerParticipant(form);
            setMessage('Registration successful! You can now log in.');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err: any) {
            setMessage(err.response?.data?.message || 'Something went wrong');
        }
    };

    const handleValidatedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const fields = ['fullName', 'email', 'password', 'mobileNumber', 'dob'];
        const nextErrors = Object.fromEntries(
            fields.map((field) => [field, validateRegisterField(field, String(formData.get(field) || ''))])
        );
        setValidationErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) return;
        handleSubmit(e);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">🌲</span>
                    <h2>Register as Participant</h2>
                    <p className="auth-subtitle">Create an account to book your next trail</p>
                </div>
                <form onSubmit={handleValidatedSubmit} noValidate>
                    <div className="form-group">
                        <label htmlFor="reg-fullName">Full Name</label>
                        <input id="reg-fullName" name="fullName" placeholder="John Doe" onChange={handleChange} onBlur={(e) => handleRegisterBlur('fullName', e.target.value)} aria-invalid={Boolean(validationErrors.fullName)} required />
                        {validationErrors.fullName && <p className="field-error">{validationErrors.fullName}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-email">Email Address</label>
                        <input id="reg-email" name="email" type="email" placeholder="john@example.com" onChange={handleChange} onBlur={(e) => handleRegisterBlur('email', e.target.value)} aria-invalid={Boolean(validationErrors.email)} required />
                        {validationErrors.email && <p className="field-error">{validationErrors.email}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-password">Password</label>
                        <input id="reg-password" name="password" type="password" placeholder="••••••••" onChange={handleChange} onBlur={(e) => handleRegisterBlur('password', e.target.value)} aria-invalid={Boolean(validationErrors.password)} required />
                        {validationErrors.password && <p className="field-error">{validationErrors.password}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-mobileNumber">Mobile Number</label>
                        <input id="reg-mobileNumber" name="mobileNumber" placeholder="+1234567890" onChange={handleChange} onBlur={(e) => handleRegisterBlur('mobileNumber', e.target.value)} aria-invalid={Boolean(validationErrors.mobileNumber)} required />
                        {validationErrors.mobileNumber && <p className="field-error">{validationErrors.mobileNumber}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-dob">Date of Birth</label>
                        <input id="reg-dob" name="dob" type="date" onChange={handleChange} onBlur={(e) => handleRegisterBlur('dob', e.target.value)} aria-invalid={Boolean(validationErrors.dob)} required />
                        {validationErrors.dob && <p className="field-error">{validationErrors.dob}</p>}
                    </div>
                    <button type="submit" className="btn">Register</button>
                    {message && (
                        <p className={message.includes('successful') ? 'alert alert-success' : 'alert alert-error'}>
                            {message}
                        </p>
                    )}
                </form>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Already registered? </span>
                        <Link to="/login">Sign in</Link>
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                        <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to Home</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}