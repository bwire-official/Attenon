import { useState, useEffect } from 'react';
import { supabase, Class } from '../lib/supabase';
import { getCurrentUser } from '../services/session';
import { enrollStudent, unenrollStudent, getStudentClasses } from '../services/data';

export const useAllCourses = () => {
    const [courses, setCourses] = useState<Class[]>([]);
    const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    const fetchData = async () => {
        try {
            const profile = await getCurrentUser();
            setUserProfile(profile);

            // Fetch all available active courses
            const { data: allCourses, error: coursesError } = await supabase
                .from('classes')
                .select('*')
                .eq('is_active', true)
                .order('course_code');

            if (coursesError) throw coursesError;

            // Fetch current student's enrollments to show 'Joined' status
            if (profile) {
                const enrolled = await getStudentClasses(profile.id);
                setEnrolledIds(new Set(enrolled.map(e => e.id)));
            }

            setCourses(allCourses || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEnroll = async (courseId: string) => {
        if (!userProfile) return;

        const isEnrolled = enrolledIds.has(courseId);

        try {
            if (isEnrolled) {
                const success = await unenrollStudent(userProfile.id, courseId);
                if (success) {
                    const newSet = new Set(enrolledIds);
                    newSet.delete(courseId);
                    setEnrolledIds(newSet);
                }
            } else {
                const success = await enrollStudent(userProfile.id, courseId);
                if (success) {
                    const newSet = new Set(enrolledIds);
                    newSet.add(courseId);
                    setEnrolledIds(newSet);
                }
            }
        } catch (error) {
            console.error('Enrollment error:', error);
        }
    };

    const groupedCourses = courses.reduce((acc, course) => {
        const dept = course.department || 'Other';
        const level = course.level || 'General';
        const key = `${dept} - ${level}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(course);
        return acc;
    }, {} as Record<string, Class[]>);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    return {
        courses,
        enrolledIds,
        loading,
        refreshing,
        groupedCourses,
        handleEnroll,
        onRefresh
    };
};
