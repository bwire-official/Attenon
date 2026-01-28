import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedScreenProps {
    children: React.ReactNode;
    isActive: boolean;
    direction?: 'forward' | 'backward';
}

export const AnimatedScreen = ({ children, isActive, direction = 'forward' }: AnimatedScreenProps) => {
    const slideAnim = useRef(new Animated.Value(isActive ? 0 : (direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH))).current;
    const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
    const useNativeDriver = Platform.OS !== 'web';

    useEffect(() => {
        if (isActive) {
            slideAnim.setValue(direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH);
            opacityAnim.setValue(0);

            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH,
                    duration: 250,
                    useNativeDriver,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver,
                }),
            ]).start();
        }
    }, [isActive, direction, slideAnim, opacityAnim, useNativeDriver]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateX: slideAnim }],
                    opacity: opacityAnim,
                    zIndex: isActive ? 1 : 0,
                    ...(Platform.OS === 'web' && { pointerEvents: isActive ? 'auto' : 'none' } as any),
                },
            ]}
            {...(Platform.OS !== 'web' && { pointerEvents: isActive ? 'auto' : 'none' })}
        >
            {children}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
    },
});
