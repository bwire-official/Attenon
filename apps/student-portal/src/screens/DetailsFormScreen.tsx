import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaCheckCircle } from 'react-icons/fa';
import { SearchableSelect } from '../components/SearchableSelect';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getAllFacultyNames, getDepartmentsByFaculty } from '../data/faculties';
import { registerStudent, checkEmailExists, checkRegNumberExists } from '../services/registration';
import './DetailsFormScreen.css';

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    regNumber: string;
    department: string;
    faculty: string;
    level: string;
    phoneNumber: string;
}

const STORAGE_KEY = 'attenon_student_registration';

function loadFormDataFromStorage(): { formData: FormData; step: number } | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading form data from storage:', error);
    }
    return null;
}

function saveFormDataToStorage(formData: FormData, step: number) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, step }));
    } catch (error) {
        console.error('Error saving form data to storage:', error);
    }
}

function clearFormDataFromStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing form data from storage:', error);
    }
}

export function DetailsFormScreen() {
    const navigate = useNavigate();
    
    const storedData = loadFormDataFromStorage();
    const [step, setStep] = useState(storedData?.step || 1);
    const [formData, setFormData] = useState<FormData>(storedData?.formData || {
        firstName: '',
        lastName: '',
        email: '',
        regNumber: '',
        department: '',
        faculty: '',
        level: '',
        phoneNumber: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [submissionError, setSubmissionError] = useState<string>('');
    const [editingRegNumber, setEditingRegNumber] = useState(false);
    const [tempRegNumber, setTempRegNumber] = useState('');
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [checkingRegNumber, setCheckingRegNumber] = useState(false);

    const totalSteps = 3;

    // Save to localStorage whenever formData or step changes
    useEffect(() => {
        if (!submitted && !loading && (formData.firstName || formData.email || formData.faculty)) {
            saveFormDataToStorage(formData, step);
        }
    }, [formData, step, submitted, loading]);

    function validateStep(stepNumber: number): boolean {
        const newErrors: Record<string, string> = {};

        if (stepNumber === 1) {
            if (!formData.firstName.trim()) {
                newErrors.firstName = 'First name is required';
            }
            if (!formData.lastName.trim()) {
                newErrors.lastName = 'Last name is required';
            }
            if (!formData.email.trim()) {
                newErrors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
                newErrors.email = 'Please enter a valid email address';
            }
            if (!formData.regNumber.trim()) {
                newErrors.regNumber = 'Student matriculation/reg number is required';
            } else {
                const regNumberUpper = formData.regNumber.trim().toUpperCase();
                if (!regNumberUpper.startsWith('RU')) {
                    newErrors.regNumber = 'Registration number must start with "RU" (e.g., RU021023...)';
                } else if (regNumberUpper.length < 10) {
                    newErrors.regNumber = 'Registration number must be at least 10 characters';
                }
            }
        } else if (stepNumber === 2) {
            if (!formData.department.trim()) {
                newErrors.department = 'Department is required';
            }
            if (!formData.faculty.trim()) {
                newErrors.faculty = 'Faculty is required';
            }
            if (!formData.level.trim()) {
                newErrors.level = 'Current level is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function updateField(field: keyof FormData, value: string) {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (!submitted && !loading) {
                saveFormDataToStorage(updated, step);
            }
            return updated;
        });
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }


    async function handleNext() {
        if (!validateStep(step)) {
            return;
        }

        // Check for duplicates on Step 1 before proceeding
        if (step === 1) {
            setCheckingEmail(true);
            setCheckingRegNumber(true);

            const [emailExists, regNumberExists] = await Promise.all([
                checkEmailExists(formData.email.trim()),
                checkRegNumberExists(formData.regNumber.trim()),
            ]);

            setCheckingEmail(false);
            setCheckingRegNumber(false);

            const newErrors: Record<string, string> = {};

            if (emailExists) {
                newErrors.email = 'This email has already been used. Please use a different email address.';
            }

            if (regNumberExists) {
                newErrors.regNumber = 'This registration number has already been used. Please verify your registration number.';
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        }

        if (step < totalSteps) {
            const newStep = step + 1;
            setStep(newStep);
            if (!submitted && !loading) {
                saveFormDataToStorage(formData, newStep);
            }
        }
    }

    function handleBack() {
        if (step > 1) {
            const newStep = step - 1;
            setStep(newStep);
            if (!submitted && !loading) {
                saveFormDataToStorage(formData, newStep);
            }
        } else {
            navigate('/');
        }
    }

    function handleSaveRegNumber() {
        const regNumberUpper = tempRegNumber.toUpperCase().trim();
        
        // Validate
        if (!regNumberUpper) {
            setErrors(prev => ({ ...prev, regNumber: 'Registration number is required' }));
            return;
        }
        
        if (!regNumberUpper.startsWith('RU')) {
            setErrors(prev => ({ ...prev, regNumber: 'Registration number must start with "RU"' }));
            return;
        }
        
        if (regNumberUpper.length < 10) {
            setErrors(prev => ({ ...prev, regNumber: 'Registration number must be at least 10 characters' }));
            return;
        }
        
        // Clear any existing errors
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.regNumber;
            return newErrors;
        });
        
        // Update the field
        updateField('regNumber', regNumberUpper);
        setEditingRegNumber(false);
    }

    function handleCancelRegNumberEdit() {
        setTempRegNumber(formData.regNumber);
        setEditingRegNumber(false);
        // Clear any errors
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.regNumber;
            return newErrors;
        });
    }

    async function handleSubmitClick(e: FormEvent) {
        e.preventDefault();
        
        if (!validateStep(step)) {
            return;
        }

        if (step === totalSteps) {
            setShowConfirmModal(true);
        } else {
            await handleNext();
        }
    }

    async function handleConfirmSubmit() {
        setShowConfirmModal(false);
        setLoading(true);
        setSubmissionError('');

        // Submit to Supabase
        const result = await registerStudent({
            email: formData.email.trim(),
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            reg_number: formData.regNumber.trim(),
            department: formData.department.trim(),
            faculty: formData.faculty.trim(),
            level: formData.level.trim(),
            phone_number: formData.phoneNumber.trim() || undefined,
        });

        setLoading(false);

        if (result.success) {
            setSubmitted(true);
            clearFormDataFromStorage();
        } else {
            setSubmissionError(result.error || 'Registration failed. Please try again.');
            // Scroll to top to show error
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    if (loading) {
        return (
            <div className="form-container">
                <div className="form-card">
                    <div className="loading-wrapper">
                        <LoadingSpinner />
                        <p className="loading-text">Submitting your information...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="form-container">
                <div className="form-card success-card">
                    <div style={{ textAlign: 'center' }}>
                        <FaCheckCircle 
                            style={{ 
                                fontSize: '64px', 
                                marginBottom: '20px', 
                                color: '#10b981' 
                            }} 
                        />
                        <h2>Registration Successful!</h2>
                        <p>Your information has been submitted successfully.</p>
                        <p className="success-note" style={{ marginTop: '20px', lineHeight: '1.6' }}>
                            You will use the email address <strong>{formData.email}</strong> to sign up into the <strong>Attenon mobile app</strong> when it becomes available. A confirmation email will be sent to you shortly with further instructions.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                marginTop: '30px',
                                padding: '14px 32px',
                                backgroundColor: '#18191b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#313235';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#18191b';
                            }}
                        >
                            Back to Homepage
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <ConfirmationModal
                isOpen={showConfirmModal}
                onConfirm={handleConfirmSubmit}
                onCancel={() => setShowConfirmModal(false)}
                title="Confirm Submission"
                message="Are you sure you want to submit your registration? Please review your information carefully."
                confirmText="Yes, Submit"
                cancelText="Cancel"
            />
            <div className="form-container">
                <div className="form-card">
                {submissionError && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        color: '#c33',
                        fontSize: '14px',
                    }}>
                        <strong>Error:</strong> {submissionError}
                    </div>
                )}
                <div className="wizard-header">
                    <h1 className="form-title">Student Registration</h1>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                    <p className="step-indicator">Step {step} of {totalSteps}</p>
                </div>

                <form onSubmit={handleSubmitClick} className="form">
                    {step === 1 && (
                        <>
                            <div className="form-group">
                                <label htmlFor="firstName">First Name *</label>
                                <input
                                    id="firstName"
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => updateField('firstName', e.target.value)}
                                    placeholder="Enter your first name"
                                    required
                                    disabled={loading}
                                />
                                {errors.firstName && <span className="error">{errors.firstName}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="lastName">Last Name *</label>
                                <input
                                    id="lastName"
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => updateField('lastName', e.target.value)}
                                    placeholder="Enter your last name"
                                    required
                                    disabled={loading}
                                />
                                {errors.lastName && <span className="error">{errors.lastName}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email Address *</label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateField('email', e.target.value)}
                                        placeholder="Enter your email"
                                        required
                                        disabled={loading || checkingEmail || checkingRegNumber}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                {errors.email && <span className="error">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="regNumber">Student Matriculation/Reg Number *</label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        id="regNumber"
                                        type="text"
                                        value={formData.regNumber}
                                        onChange={(e) => {
                                            let value = e.target.value.toUpperCase();
                                            // Ensure it starts with RU if user is typing
                                            if (value.length > 0 && !value.startsWith('RU')) {
                                                // If they haven't typed RU yet, allow it but show hint
                                                if (value.length === 1 && value !== 'R') {
                                                    value = 'RU' + value;
                                                } else if (value.length === 1 && value === 'R') {
                                                    // Just R, allow it
                                                } else if (value.length === 2 && value === 'RU') {
                                                    // Just RU, allow it
                                                } else if (!value.startsWith('RU')) {
                                                    // If they typed something else, prepend RU
                                                    value = 'RU' + value.replace(/^RU/i, '');
                                                }
                                            }
                                            updateField('regNumber', value);
                                        }}
                                        placeholder="RU021023..."
                                        required
                                        disabled={loading || checkingEmail || checkingRegNumber}
                                        style={{
                                            width: '100%',
                                            textTransform: 'uppercase',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                {errors.regNumber && <span className="error">{errors.regNumber}</span>}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <SearchableSelect
                                id="faculty"
                                label="Faculty *"
                                value={formData.faculty}
                                options={getAllFacultyNames()}
                                onChange={(value) => {
                                    updateField('faculty', value);
                                    if (formData.department) {
                                        const departments = getDepartmentsByFaculty(value);
                                        const departmentExists = departments.some(d => d.name === formData.department);
                                        if (!departmentExists) {
                                            updateField('department', '');
                                        }
                                    }
                                }}
                                placeholder="Search and select your faculty"
                                required
                                disabled={loading}
                                error={errors.faculty}
                            />

                            <SearchableSelect
                                id="department"
                                label="Department *"
                                value={formData.department}
                                options={formData.faculty 
                                    ? getDepartmentsByFaculty(formData.faculty).map(d => d.name)
                                    : []
                                }
                                onChange={(value) => updateField('department', value)}
                                placeholder={formData.faculty 
                                    ? "Search and select your department"
                                    : "Please select a faculty first"
                                }
                                required
                                disabled={loading || !formData.faculty}
                                error={errors.department}
                            />

                            <div className="form-group">
                                <label htmlFor="level">Current Level *</label>
                                <select
                                    id="level"
                                    value={formData.level}
                                    onChange={(e) => updateField('level', e.target.value)}
                                    required
                                    disabled={loading}
                                >
                                    <option value="">Select level</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                    <option value="300">300</option>
                                    <option value="400">400</option>
                                </select>
                                {errors.level && <span className="error">{errors.level}</span>}
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="form-group">
                                <label htmlFor="phoneNumber">Phone Number</label>
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => updateField('phoneNumber', e.target.value)}
                                    placeholder="Enter your phone number (optional)"
                                    disabled={loading}
                                />
                            </div>

                            <div className="review-section">
                                <h3 className="review-title">Review Your Information</h3>
                                <div className="review-item">
                                    <span className="review-label">First Name:</span>
                                    <span className="review-value">{formData.firstName}</span>
                                </div>
                                <div className="review-item">
                                    <span className="review-label">Last Name:</span>
                                    <span className="review-value">{formData.lastName}</span>
                                </div>
                                <div className="review-item">
                                    <span className="review-label">Email:</span>
                                    <span className="review-value">{formData.email}</span>
                                </div>
                                <div className="review-item">
                                    <span className="review-label">Student Matriculation/Reg Number:</span>
                                    {editingRegNumber ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                            <input
                                                type="text"
                                                value={tempRegNumber}
                                                onChange={(e) => {
                                                    let value = e.target.value.toUpperCase();
                                                    if (value.length > 0 && !value.startsWith('RU')) {
                                                        if (value.length === 1 && value !== 'R') {
                                                            value = 'RU' + value;
                                                        } else if (value.length === 1 && value === 'R') {
                                                            // Just R, allow it
                                                        } else if (value.length === 2 && value === 'RU') {
                                                            // Just RU, allow it
                                                        } else if (!value.startsWith('RU')) {
                                                            value = 'RU' + value.replace(/^RU/i, '');
                                                        }
                                                    }
                                                    setTempRegNumber(value);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveRegNumber();
                                                    } else if (e.key === 'Escape') {
                                                        handleCancelRegNumberEdit();
                                                    }
                                                }}
                                                autoFocus
                                                style={{
                                                    flex: 1,
                                                    padding: '4px 8px',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                    textTransform: 'uppercase',
                                                }}
                                            />
                                            <button
                                                onClick={handleSaveRegNumber}
                                                style={{
                                                    padding: '4px 8px',
                                                    backgroundColor: '#18191b',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelRegNumberEdit}
                                                style={{
                                                    padding: '4px 8px',
                                                    backgroundColor: '#e4e5e7',
                                                    color: '#18191b',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="review-value">{formData.regNumber}</span>
                                            <FaEdit
                                                onClick={() => {
                                                    setTempRegNumber(formData.regNumber);
                                                    setEditingRegNumber(true);
                                                }}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: '#666',
                                                    fontSize: '14px',
                                                }}
                                                title="Edit registration number"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="review-item">
                                    <span className="review-label">Department:</span>
                                    <span className="review-value">{formData.department}</span>
                                </div>
                                <div className="review-item">
                                    <span className="review-label">Faculty:</span>
                                    <span className="review-value">{formData.faculty}</span>
                                </div>
                                <div className="review-item">
                                    <span className="review-label">Current Level:</span>
                                    <span className="review-value">{formData.level}</span>
                                </div>
                                {formData.phoneNumber && (
                                    <div className="review-item">
                                        <span className="review-label">Phone Number:</span>
                                        <span className="review-value">{formData.phoneNumber}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="form-actions">
                        <button 
                            type="button"
                            className="button-secondary"
                            onClick={handleBack}
                            disabled={loading || checkingEmail || checkingRegNumber}
                        >
                            {step === 1 ? 'Back' : 'Previous'}
                        </button>
                        <button 
                            type="submit" 
                            className="button-primary"
                            disabled={loading || checkingEmail || checkingRegNumber}
                        >
                            {(checkingEmail || checkingRegNumber) && step === 1 
                                ? 'Checking...' 
                                : step === totalSteps 
                                    ? 'Submit' 
                                    : 'Next'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </>
    );
}
