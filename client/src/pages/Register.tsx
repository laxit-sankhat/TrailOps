import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerParticipant } from '../services/participantService';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '', email: '', password: '', mobileNumber: '', dob: ''
    });
    const [message, setMessage] = useState('');

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

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">🌲</span>
                    <h2>Register as Participant</h2>
                    <p className="auth-subtitle">Create an account to book your next trail</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="reg-fullName">Full Name</label>
                        <input id="reg-fullName" name="fullName" placeholder="John Doe" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-email">Email Address</label>
                        <input id="reg-email" name="email" type="email" placeholder="john@example.com" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-password">Password</label>
                        <input id="reg-password" name="password" type="password" placeholder="••••••••" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-mobileNumber">Mobile Number</label>
                        <input id="reg-mobileNumber" name="mobileNumber" placeholder="+1234567890" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reg-dob">Date of Birth</label>
                        <input id="reg-dob" name="dob" type="date" onChange={handleChange} required />
                    </div>
                    <button type="submit" className="btn">Register</button>
                    {message && (
                        <p className={message.includes('successful') ? 'alert alert-success' : 'alert alert-error'}>
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}