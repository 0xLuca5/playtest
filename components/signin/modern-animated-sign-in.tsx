'use client';
import {
  memo,
  ReactNode,
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  forwardRef,
} from 'react';
import Image from 'next/image';
import {
  motion,
  useAnimation,
  useInView,
  useMotionTemplate,
  useMotionValue,
} from 'motion/react';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/theme-store';

// ==================== Theme Toggle Component ====================

const ThemeToggle = memo(function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <button
      onClick={toggleDarkMode}
      className='fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-3 rounded-full bg-white/10 dark:bg-white/20 backdrop-blur-sm border border-white/20 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/30 transition-all duration-200 group'
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className='w-5 h-5 text-white/80 group-hover:text-white transition-colors' />
      ) : (
        <Moon className='w-5 h-5 text-white/80 group-hover:text-white transition-colors' />
      )}
    </button>
  );
});

// ==================== Input Component ====================

const Input = memo(
  forwardRef(function Input(
    { className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>,
    ref: React.ForwardedRef<HTMLInputElement>
  ) {
    const radius = 100; // change this to increase the radius of the hover effect
    const [visible, setVisible] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({
      currentTarget,
      clientX,
      clientY,
    }: React.MouseEvent<HTMLDivElement>) {
      const { left, top } = currentTarget.getBoundingClientRect();

      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    return (
      <motion.div
        style={{
          background: useMotionTemplate`
        radial-gradient(
          ${visible ? radius + 'px' : '0px'} circle at ${mouseX}px ${mouseY}px,
          #3b82f6,
          transparent 80%
        )
      `,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className='group/input rounded-lg p-[2px] transition duration-300'
      >
        <input
          type={type}
          className={cn(
            `shadow-input flex h-12 w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-sm text-white transition duration-300 group-hover/input:shadow-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/50 focus-visible:ring-[2px] focus-visible:ring-blue-400/50 focus-visible:border-blue-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50`,
            className
          )}
          ref={ref}
          {...props}
        />
      </motion.div>
    );
  })
);

Input.displayName = 'Input';

// ==================== BoxReveal Component ====================

type BoxRevealProps = {
  children: ReactNode;
  width?: string;
  boxColor?: string;
  duration?: number;
  overflow?: string;
  position?: string;
  className?: string;
};

const BoxReveal = memo(function BoxReveal({
  children,
  width = 'fit-content',
  boxColor,
  duration,
  overflow = 'hidden',
  position = 'relative',
  className,
}: BoxRevealProps) {
  const mainControls = useAnimation();
  const slideControls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      slideControls.start('visible');
      mainControls.start('visible');
    } else {
      slideControls.start('hidden');
      mainControls.start('hidden');
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <section
      ref={ref}
      style={{
        position: position as
          | 'relative'
          | 'absolute'
          | 'fixed'
          | 'sticky'
          | 'static',
        width,
        overflow,
      }}
      className={className}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 },
        }}
        initial='hidden'
        animate={mainControls}
        transition={{ duration: duration ?? 0.5, delay: 0.25 }}
      >
        {children}
      </motion.div>
      <motion.div
        variants={{ hidden: { left: 0 }, visible: { left: '100%' } }}
        initial='hidden'
        animate={slideControls}
        transition={{ duration: duration ?? 0.5, ease: 'easeIn' }}
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor ?? '#5046e6',
          borderRadius: 4,
        }}
      />
    </section>
  );
});

// ==================== Ripple Component ====================

type RippleProps = {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
};

const Ripple = memo(function Ripple({
  mainCircleSize = 600,
  mainCircleOpacity = 0.2,
  numCircles = 5,
  className = '',
}: RippleProps) {
  return (
    <section
      className={`w-full h-full absolute inset-0 flex items-center justify-center ${className}`}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 120;
        const opacity = mainCircleOpacity - i * 0.04;
        const animationDelay = `${i * 0.3}s`;
        const borderStyle = i === numCircles - 1 ? 'dashed' : 'solid';
        const borderOpacity = 15 + i * 5;

        return (
          <span
            key={i}
            className='absolute animate-ripple rounded-full border'
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: opacity,
              animationDelay: animationDelay,
              borderStyle: borderStyle,
              borderWidth: '2px',
              borderColor: `rgba(255, 255, 255, ${borderOpacity / 100})`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'transparent',
            } as React.CSSProperties}
          />
        );
      })}
    </section>
  );
});

// ==================== OrbitingCircles Component ====================

type OrbitingCirclesProps = {
  className?: string;
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
};

const OrbitingCircles = memo(function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          version='1.1'
          className='pointer-events-none absolute inset-0 size-full'
        >
          <circle
            className='stroke-black/10 stroke-1 dark:stroke-white/10'
            cx='50%'
            cy='50%'
            r={radius}
            fill='none'
          />
        </svg>
      )}
      <section
        style={
          {
            '--duration': duration,
            '--radius': radius,
            '--delay': -delay,
          } as React.CSSProperties
        }
        className={cn(
          'absolute flex size-full transform-gpu animate-orbit items-center justify-center rounded-full border bg-black/10 [animation-delay:calc(var(--delay)*1000ms)] dark:bg-white/10',
          { '[animation-direction:reverse]': reverse },
          className
        )}
      >
        {children}
      </section>
    </>
  );
});

// ==================== TechOrbitDisplay Component ====================

type IconConfig = {
  className?: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
  component: () => React.ReactNode;
};

type TechnologyOrbitDisplayProps = {
  iconsArray: IconConfig[];
  text?: string;
};

const TechOrbitDisplay = memo(function TechOrbitDisplay({
  iconsArray,
  text = 'Playtest Login',
}: TechnologyOrbitDisplayProps) {
  return (
    <section className='relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg'>
      {text && (
        <span className='pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-7xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10'>
          {text}
        </span>
      )}

      {iconsArray.map((icon, index) => (
        <OrbitingCircles
          key={index}
          className={icon.className}
          duration={icon.duration}
          delay={icon.delay}
          radius={icon.radius}
          path={icon.path}
          reverse={icon.reverse}
        >
          {icon.component()}
        </OrbitingCircles>
      ))}
    </section>
  );
});

// ==================== AnimatedForm Component ====================

type FieldType = 'text' | 'email' | 'password';

type Field = {
  label: string;
  required?: boolean;
  type: FieldType;
  placeholder?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

type AnimatedFormProps = {
  header: string;
  subHeader?: string;
  fields: Field[];
  submitButton: string;
  textVariantButton?: string;
  errorField?: string;
  fieldPerRow?: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  googleLogin?: string;
  goTo?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  externalErrors?: Errors;
  isLoading?: boolean;
  disableInternalValidation?: boolean;
};

type Errors = {
  [key: string]: string;
};

const AnimatedForm = memo(function AnimatedForm({
  header,
  subHeader,
  fields,
  submitButton,
  textVariantButton,
  errorField,
  fieldPerRow = 1,
  onSubmit,
  googleLogin,
  goTo,
  externalErrors = {},
  isLoading = false,
  disableInternalValidation = false,
}: AnimatedFormProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({});



  const toggleVisibility = () => setVisible(!visible);

  const validateForm = (event: FormEvent<HTMLFormElement>) => {
    const currentErrors: Errors = {};
    fields.forEach((field) => {
      const value = (event.target as HTMLFormElement)[field.label]?.value;

      if (field.required && !value) {
        currentErrors[field.label] = `${field.label} is required`;
      }

      if (field.type === 'email' && value) {
        // 更严格的邮箱验证规则
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(value)) {
          currentErrors[field.label] = 'Please enter a valid email address';
        }
      }

      // 密码长度验证 - 只在非登录场景下验证
      if (field.type === 'password' && value && value.length < 3) {
        currentErrors[field.label] =
          'Password is too short';
      }
    });
    return currentErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disableInternalValidation) {
      // 如果禁用内部验证，直接调用外部提交函数
      onSubmit(event);
    } else {
      // 使用内部验证
      const formErrors = validateForm(event);

      if (Object.keys(formErrors).length === 0) {
        onSubmit(event);
        console.log('Form submitted');
      } else {
        setErrors(formErrors);
      }
    }
  };

  return (
    <section className='max-md:w-full flex flex-col gap-6 w-full max-w-md mx-auto'>
      <div className='text-center space-y-2'>
        <BoxReveal boxColor='var(--skeleton)' duration={0.3}>
          <h2 className='font-bold text-xl sm:text-2xl text-white/95 dark:text-white/90'>
            {header}
          </h2>
        </BoxReveal>

        {subHeader && (
          <BoxReveal boxColor='var(--skeleton)' duration={0.3} className='pb-2'>
            <p className='text-white/70 dark:text-white/60 text-sm'>
              {subHeader}
            </p>
          </BoxReveal>
        )}
      </div>

      {googleLogin && (
        <>
          <BoxReveal
            boxColor='var(--skeleton)'
            duration={0.3}
            overflow='visible'
            width='unset'
          >
            <button
              className='group/btn bg-white/5 dark:bg-white/10 backdrop-blur-sm w-full rounded-lg border border-white/10 dark:border-white/20 h-12 font-medium outline-hidden cursor-not-allowed opacity-50'
              type='button'
              disabled
              onClick={() => console.log('Google login clicked')}
            >
              <span className='flex items-center justify-center w-full h-full gap-3 text-white/40'>
                <div className='w-12 h-12 flex items-center justify-center'>
                  <Image
                    src='/epam_logo_light.svg'
                    width={48}
                    height={48}
                    alt='Epam Logo'
                    className='filter brightness-0 invert mt-1'
                  />
                </div>
                {googleLogin}
              </span>

              <BottomGradient />
            </button>
          </BoxReveal>

          <BoxReveal boxColor='var(--skeleton)' duration={0.3} width='100%'>
            <section className='flex items-center gap-4 my-4'>
              <hr className='flex-1 border-t border-dashed border-white/30 dark:border-white/40' />
              <p className='text-white/60 dark:text-white/50 text-sm px-2'>
                or
              </p>
              <hr className='flex-1 border-t border-dashed border-white/30 dark:border-white/40' />
            </section>
          </BoxReveal>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <section
          className={`grid grid-cols-1 md:grid-cols-${fieldPerRow} gap-4 mb-6`}
        >
          {fields.map((field) => (
            <section key={field.label} className='flex flex-col gap-3'>
              <BoxReveal boxColor='var(--skeleton)' duration={0.3}>
                <Label htmlFor={field.label} className='text-white/80 dark:text-white/70 text-sm font-medium'>
                  {field.label} <span className='text-red-400 dark:text-red-300'>*</span>
                </Label>
              </BoxReveal>

              <BoxReveal
                width='100%'
                boxColor='var(--skeleton)'
                duration={0.3}
                className='flex flex-col space-y-2 w-full'
              >
                <section className='relative'>
                  <Input
                    type={
                      field.type === 'password'
                        ? visible
                          ? 'text'
                          : 'password'
                        : field.type
                    }
                    id={field.label}
                    placeholder={field.placeholder}
                    onChange={field.onChange}
                    disabled={field.disabled || isLoading}
                    className='bg-white/10 dark:bg-white/15 border-white/20 dark:border-white/30 text-white placeholder:text-white/50 dark:placeholder:text-white/40 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-400/20 dark:focus:ring-blue-300/20'
                  />

                  {field.type === 'password' && (
                    <button
                      type='button'
                      onClick={toggleVisibility}
                      className='absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 dark:text-white/50 hover:text-white/80 dark:hover:text-white/70 transition-colors'
                    >
                      {visible ? (
                        <Eye className='h-5 w-5' />
                      ) : (
                        <EyeOff className='h-5 w-5' />
                      )}
                    </button>
                  )}
                </section>

                <section className='h-4'>
                  {((errors[field.label] && errors[field.label].trim() !== '') ||
                    (externalErrors[field.label] && externalErrors[field.label].trim() !== '')) && (
                    <p className='text-red-400 dark:text-red-300 text-xs'>
                      {errors[field.label] || externalErrors[field.label]}
                    </p>
                  )}
                </section>
              </BoxReveal>
            </section>
          ))}
        </section>

        <BoxReveal width='100%' boxColor='var(--skeleton)' duration={0.3}>
          {errorField && (
            <p className='text-red-500 text-sm mb-4'>{errorField}</p>
          )}
        </BoxReveal>

        <BoxReveal
          width='100%'
          boxColor='var(--skeleton)'
          duration={0.3}
          overflow='visible'
        >
          <button
            className={`group bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 hover:from-blue-600 hover:to-purple-700 dark:hover:from-blue-500 dark:hover:to-purple-600 w-full text-white rounded-lg h-12 font-medium shadow-lg hover:shadow-xl transition-all duration-200 outline-hidden ${isLoading ? 'cursor-not-allowed opacity-70' : 'hover:cursor-pointer'}`}
            type='submit'
            disabled={isLoading}
          >
            {submitButton} {!isLoading && (
              <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            )}
            {isLoading && (
              <svg className="animate-spin -mr-1 ml-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <BottomGradient />
          </button>
        </BoxReveal>

        {textVariantButton && goTo && (
          <BoxReveal boxColor='var(--skeleton)' duration={0.3}>
            <section className='mt-6 text-center hover:cursor-pointer'>
              <button
                className='text-sm text-blue-400 dark:text-blue-300 hover:text-blue-300 dark:hover:text-blue-200 transition-colors outline-hidden'
                onClick={goTo}
              >
                {textVariantButton}
              </button>
            </section>
          </BoxReveal>
        )}
      </form>
    </section>
  );
});

const BottomGradient = () => {
  return (
    <>
      <span className='group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent' />
      <span className='group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent' />
    </>
  );
};

// ==================== AuthTabs Component ====================

interface AuthTabsProps {
  formFields: {
    header: string;
    subHeader?: string;
    fields: Field[];
    submitButton: string;
    textVariantButton?: string;
    externalErrors?: Errors;
    isLoading?: boolean;
    disableInternalValidation?: boolean;
  };
  goTo: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  iconsArray?: IconConfig[];
}

const AuthTabs = memo(function AuthTabs({
  formFields,
  goTo,
  handleSubmit,
  iconsArray = [],
}: AuthTabsProps) {
  return (
    <section
      className='relative w-full h-screen min-h-[100dvh] flex items-center justify-center bg-gray-900 dark:bg-gray-950 px-4 sm:px-6 lg:px-8 overflow-hidden'
      data-page="signin"
    >
      {/* Theme Toggle Button */}
      <ThemeToggle />

      {/* Background Ripple Animation */}
      <div className='absolute inset-0 flex items-center justify-center'>
        <Ripple />
      </div>

      {/* Tech Icons Orbiting */}
      <div className='absolute inset-0 flex items-center justify-center'>
        <TechOrbitDisplay iconsArray={iconsArray} text="" />
      </div>

      {/* Login Form in Center */}
      <div className='relative z-10 flex items-center justify-center w-full h-full min-h-[100dvh]'>
        <div className='w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl px-4 sm:px-6 lg:px-8 flex flex-col items-center py-8 sm:py-12'>
          {/* Title above form */}
          <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white/95 dark:text-white/90 tracking-wider mb-4 text-center'>
            Playtest
          </h1>

          {/* Subtitle */}
          <p className='text-white/70 dark:text-white/60 text-base sm:text-lg mb-6 sm:mb-8 text-center'>
            AI-Powered Testing Platform
          </p>

          {/* Form Container with Glass Effect */}
          <div className='w-full backdrop-blur-md bg-white/5 dark:bg-white/10 rounded-2xl border border-white/10 dark:border-white/20 p-6 sm:p-8 shadow-2xl hover:bg-white/10 dark:hover:bg-white/15 transition-all duration-300'>
            <AnimatedForm
              {...formFields}
              fieldPerRow={1}
              onSubmit={handleSubmit}
              goTo={goTo}
              googleLogin='Login with Epam'
            />
          </div>
        </div>
      </div>
    </section>
  );
});

// ==================== Label Component ====================

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
}

const Label = memo(function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
});

// ==================== Exports ====================

export {
  Input,
  BoxReveal,
  Ripple,
  OrbitingCircles,
  TechOrbitDisplay,
  AnimatedForm,
  AuthTabs,
  Label,
  BottomGradient,
  ThemeToggle,
};

export type { IconConfig };
