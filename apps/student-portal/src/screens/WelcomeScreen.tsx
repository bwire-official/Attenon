import { useNavigate } from 'react-router-dom';
import './WelcomeScreen.css';

export function WelcomeScreen() {
    const navigate = useNavigate();

    return (
        <div className="welcome-container">
            <div className="welcome-content">
                <div className="logo-container">
                    <img 
                        src="/attenon-logo.png" 
                        alt="Attenon Logo" 
                        className="logo"
                    />
                </div>

                <p className="welcome-subtitle">
                    Smart Biometric Attendance System
                </p>
                <p className="welcome-description">
                    Complete the registration form to access the mobile attendance system.
                    Please provide your student details to continue.
                </p>

                <button 
                    className="welcome-button"
                    onClick={() => navigate('/form')}
                >
                    Get Started
                </button>
            </div>
        </div>
    );
}
