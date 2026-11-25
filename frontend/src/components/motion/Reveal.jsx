/**
 * Viewport-entry animations: a gentle fade + slide-up, played once.
 * Motion's MotionConfig (see SettingsContext) disables transforms under reduced motion.
 */
import { motion } from 'motion/react';

export const EASE = [0.22, 1, 0.36, 1];

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export function Reveal({ as = 'div', delay = 0, className, children, ...props }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      variants={{ hidden: itemVariants.hidden, show: { ...itemVariants.show, transition: { ...itemVariants.show.transition, delay } } }}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Parent that staggers its <StaggerItem> children as they enter the viewport. */
export function Stagger({ as = 'div', className, stagger = 0.06, children, ...props }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      {...props}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ as = 'div', className, children, ...props }) {
  const Component = motion[as];
  return (
    <Component className={className} variants={itemVariants} {...props}>
      {children}
    </Component>
  );
}
