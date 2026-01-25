import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface StudentListScreenProps {
    onBack?: () => void;
}

interface Student {
    id: string;
    fullName: string;
    email: string;
    studentId: string;
    phoneNumber?: string;
    courseId?: string;
    year?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOCK_STUDENTS: Student[] = [
    { id: '1', fullName: 'John Doe', email: 'john.doe@university.edu', studentId: 'STU001', phoneNumber: '+1234567890', courseId: 'CSC 401', year: 'Year 4' },
    { id: '2', fullName: 'Jane Smith', email: 'jane.smith@university.edu', studentId: 'STU002', phoneNumber: '+1234567891', courseId: 'CSC 412', year: 'Year 3' },
    { id: '3', fullName: 'Bob Johnson', email: 'bob.johnson@university.edu', studentId: 'STU003', phoneNumber: '+1234567892', courseId: 'CSC 405', year: 'Year 4' },
];

export const StudentListScreen = ({ onBack }: StudentListScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [studentId, setStudentId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [courseId, setCourseId] = useState('');
    const [year, setYear] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const isSmallScreen = SCREEN_HEIGHT < 700;
    const isAndroid = Platform.OS === 'android';

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        } else if (fullName.trim().length < 2) {
            newErrors.fullName = 'Full name must be at least 2 characters';
        }
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!studentId.trim()) {
            newErrors.studentId = 'Student ID is required';
        } else if (studentId.trim().length < 3) {
            newErrors.studentId = 'Student ID must be at least 3 characters';
        }
        if (phoneNumber.trim() && !/^[\d\s\-\+\(\)]+$/.test(phoneNumber.trim())) {
            newErrors.phoneNumber = 'Please enter a valid phone number';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = () => {
        if (!validateForm()) {
            return;
        }
        setLoading(true);
        setTimeout(() => {
            const newStudent: Student = {
                id: `STU${String(students.length + 1).padStart(3, '0')}`,
                fullName: fullName.trim(),
                email: email.trim(),
                studentId: studentId.trim(),
                phoneNumber: phoneNumber.trim() || undefined,
                courseId: courseId.trim() || undefined,
                year: year.trim() || undefined,
            };
            setStudents([...students, newStudent]);
            setLoading(false);
            Alert.alert(
                'Success',
                `Student ${newStudent.fullName} has been registered successfully!`,
                [{ text: 'OK', onPress: () => {
                    setShowRegisterForm(false);
                    resetForm();
                }}]
            );
        }, 1500);
    };

    const resetForm = () => {
        setFullName('');
        setEmail('');
        setStudentId('');
        setPhoneNumber('');
        setCourseId('');
        setYear('');
        setErrors({});
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const handleCancelRegister = () => {
        setShowRegisterForm(false);
        resetForm();
    };

    return (
        <ScreenWrapper style={{ paddingHorizontal: 0 }}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={onBack}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name="arrow-back" 
                            size={24} 
                            color={isDark ? colorPalette.grey[100] : colors.text.primary} 
                        />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Student List</Text>
                    {!showRegisterForm && (
                        <TouchableOpacity 
                            onPress={() => setShowRegisterForm(true)}
                            style={styles.addButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons 
                                name="person-add" 
                                size={24} 
                                color={isDark ? colorPalette.grey[100] : colors.text.primary} 
                            />
                        </TouchableOpacity>
                    )}
                    {showRegisterForm && <View style={styles.headerSpacer} />}
                </View>

                {showRegisterForm ? (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                        style={{ flex: 1 }}
                    >
                        <ScrollView 
                            contentContainerStyle={[
                                styles.scrollContent,
                                isAndroid && styles.scrollContentAndroid,
                                { paddingBottom: Math.max(insets.bottom, layout.spacing.lg) }
                            ]} 
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={[
                                styles.logoContainer, 
                                isSmallScreen && styles.logoContainerSmall,
                                isAndroid && styles.logoContainerAndroid
                            ]}>
                                <View style={[styles.iconContainer, { backgroundColor: isDark ? colorPalette.grey[900] : colorPalette.frozenLake[100] }]}>
                                    <Ionicons 
                                        name="person-add" 
                                        size={48} 
                                        color={isDark ? colorPalette.grey[100] : colors.primary} 
                                    />
                                </View>
                                <Text style={[
                                    styles.title, 
                                    isSmallScreen && styles.titleSmall,
                                    isAndroid && styles.titleAndroid,
                                    { color: colors.text.primary }
                                ]}>Register New Student</Text>
                                <Text style={[
                                    styles.subtitle, 
                                    isSmallScreen && styles.subtitleSmall,
                                    isAndroid && styles.subtitleAndroid,
                                    { color: colors.text.secondary }
                                ]}>
                                    Enter student information to add them to the system
                                </Text>
                            </View>

                            <View style={styles.form}>
                                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Personal Information</Text>
                                
                                <Input
                                    label="Full Name *"
                                    value={fullName}
                                    onChangeText={(text) => {
                                        setFullName(text);
                                        clearError('fullName');
                                    }}
                                    placeholder="Enter student's full name"
                                    keyboardType="default"
                                    autoCapitalize="words"
                                    icon="person-outline"
                                    error={errors.fullName}
                                />

                                <Input
                                    label="Email Address *"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        clearError('email');
                                    }}
                                    placeholder="Enter student's email"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    icon="mail-outline"
                                    error={errors.email}
                                />

                                <Input
                                    label="Student ID *"
                                    value={studentId}
                                    onChangeText={(text) => {
                                        setStudentId(text);
                                        clearError('studentId');
                                    }}
                                    placeholder="Enter student ID"
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    icon="id-card-outline"
                                    error={errors.studentId}
                                />

                                <Input
                                    label="Phone Number"
                                    value={phoneNumber}
                                    onChangeText={(text) => {
                                        setPhoneNumber(text);
                                        clearError('phoneNumber');
                                    }}
                                    placeholder="Enter phone number (optional)"
                                    keyboardType="phone-pad"
                                    autoCapitalize="none"
                                    icon="call-outline"
                                    error={errors.phoneNumber}
                                />

                                <View style={styles.divider} />

                                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Academic Information</Text>

                                <Input
                                    label="Course/Program"
                                    value={courseId}
                                    onChangeText={setCourseId}
                                    placeholder="Enter course or program (optional)"
                                    keyboardType="default"
                                    autoCapitalize="words"
                                    icon="library-outline"
                                />

                                <Input
                                    label="Year/Level"
                                    value={year}
                                    onChangeText={setYear}
                                    placeholder="Enter year or level (optional)"
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    icon="calendar-outline"
                                />

                                <View style={styles.infoBox}>
                                    <Ionicons 
                                        name="information-circle-outline" 
                                        size={20} 
                                        color={isDark ? colorPalette.grey[100] : colors.primary} 
                                    />
                                    <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                                        Fields marked with * are required. You can add course and year information later.
                                    </Text>
                                </View>

                                <View style={styles.buttonRow}>
                                    <Button
                                        title="Cancel"
                                        onPress={handleCancelRegister}
                                        variant="outline"
                                        style={[styles.cancelButton, { flex: 1 }]}
                                    />
                                    <Button
                                        title="Register"
                                        onPress={handleRegister}
                                        loading={loading}
                                        disabled={!fullName.trim() || !email.trim() || !studentId.trim()}
                                        style={[styles.registerButton, { flex: 1 }]}
                                    />
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                ) : (
                    <ScrollView 
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingBottom: Math.max(insets.bottom, layout.spacing.lg) }
                        ]} 
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.statsContainer}>
                            <View style={[styles.statCard, { backgroundColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                                <Ionicons 
                                    name="people" 
                                    size={24} 
                                    color={colors.primary} 
                                />
                                <Text style={[styles.statValue, { color: colors.text.primary }]}>{students.length}</Text>
                                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Students</Text>
                            </View>
                        </View>

                        <View style={styles.listHeader}>
                            <Text style={[styles.listTitle, { color: colors.text.primary }]}>All Students</Text>
                        </View>

                        {students.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons 
                                    name="people-outline" 
                                    size={64} 
                                    color={colors.text.secondary} 
                                />
                                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                                    No students registered yet
                                </Text>
                                <Text style={[styles.emptyStateSubtext, { color: colors.text.tertiary }]}>
                                    Tap the + button to register a new student
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.studentList}>
                                {students.map((student) => (
                                    <TouchableOpacity
                                        key={student.id}
                                        style={[styles.studentCard, { backgroundColor: isDark ? colorPalette.grey[900] : colors.white }]}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.avatar, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100] }]}>
                                            <Text style={[styles.avatarText, { color: isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600] }]}>
                                                {student.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </Text>
                                        </View>
                                        <View style={styles.studentInfo}>
                                            <Text style={[styles.studentName, { color: colors.text.primary }]}>{student.fullName}</Text>
                                            <Text style={[styles.studentEmail, { color: colors.text.secondary }]}>{student.email}</Text>
                                            <View style={styles.studentMeta}>
                                                <View style={styles.metaItem}>
                                                    <Ionicons name="id-card-outline" size={14} color={colors.text.tertiary} />
                                                    <Text style={[styles.metaText, { color: colors.text.tertiary }]}>{student.studentId}</Text>
                                                </View>
                                                {student.courseId && (
                                                    <View style={styles.metaItem}>
                                                        <Ionicons name="library-outline" size={14} color={colors.text.tertiary} />
                                                        <Text style={[styles.metaText, { color: colors.text.tertiary }]}>{student.courseId}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <Ionicons 
                                            name="chevron-forward" 
                                            size={20} 
                                            color={colors.text.tertiary} 
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: layout.spacing.md,
        paddingHorizontal: layout.spacing.md,
        paddingBottom: layout.spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
    },
    addButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.lg,
        paddingBottom: layout.spacing.lg,
    },
    scrollContentAndroid: {
        paddingTop: layout.spacing.md,
        paddingHorizontal: layout.spacing.lg,
    },
    listContent: {
        flexGrow: 1,
        paddingHorizontal: layout.spacing.md,
        paddingTop: layout.spacing.md,
        paddingBottom: layout.spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: layout.spacing.xl,
    },
    logoContainerSmall: {
        marginBottom: layout.spacing.lg,
    },
    logoContainerAndroid: {
        marginBottom: layout.spacing.md,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: layout.borderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.lg,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xs,
    },
    titleSmall: {
        fontSize: 24,
    },
    titleAndroid: {
        fontSize: 22,
        marginBottom: layout.spacing.xs / 2,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    subtitleSmall: {
        fontSize: 14,
    },
    subtitleAndroid: {
        fontSize: 13,
    },
    form: {
        marginTop: layout.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: layout.spacing.md,
        marginTop: layout.spacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: 'transparent',
        marginVertical: layout.spacing.lg,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        marginTop: layout.spacing.md,
        marginBottom: layout.spacing.lg,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        marginLeft: layout.spacing.sm,
        lineHeight: 18,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: layout.spacing.md,
        marginTop: layout.spacing.sm,
    },
    cancelButton: {
        marginTop: 0,
    },
    registerButton: {
        marginTop: 0,
    },
    statsContainer: {
        marginBottom: layout.spacing.lg,
    },
    statCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.lg,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
        marginTop: layout.spacing.sm,
        marginBottom: layout.spacing.xs,
    },
    statLabel: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
    listHeader: {
        marginBottom: layout.spacing.md,
    },
    listTitle: {
        fontSize: 20,
        fontFamily: 'Montserrat_600SemiBold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: layout.spacing.xxl * 2,
    },
    emptyStateText: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
        marginTop: layout.spacing.lg,
        marginBottom: layout.spacing.xs,
    },
    emptyStateSubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
    studentList: {
        gap: layout.spacing.md,
    },
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    avatarText: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: layout.spacing.xs / 2,
    },
    studentEmail: {
        fontSize: 14,
        marginBottom: layout.spacing.xs,
    },
    studentMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: layout.spacing.sm,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.xs / 2,
    },
    metaText: {
        fontSize: 12,
    },
});
