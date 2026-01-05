import React from 'react';
import { motion, type HTMLMotionProps, type Easing } from 'framer-motion';

interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

const customEase: Easing = [0.2, 0.8, 0.2, 1];

const pageVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.98, 
    filter: 'blur(8px)',
    y: 10
  },
  animate: { 
    opacity: 1, 
    scale: 1, 
    filter: 'blur(0px)',
    y: 0,
    transition: {
        duration: 0.4,
        ease: customEase,
        scale: { duration: 0.4, ease: customEase },
        filter: { duration: 0.3 }
    }
  },
  exit: { 
    opacity: 0, 
    scale: 1.02, 
    filter: 'blur(8px)',
    transition: {
        duration: 0.3,
        ease: 'easeIn' as const
    }
  }
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className, ...props }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={{
        width: '100%',
        height: '100%',
        ...props.style
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
