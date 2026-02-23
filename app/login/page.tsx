'use client';
import { useState, ChangeEvent, FormEvent, ReactNode } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import {
  Ripple,
  AuthTabs,
  TechOrbitDisplay,
} from '@/components/signin/modern-animated-sign-in';
import Image from 'next/image';

type FormData = {
  email: string;
  password: string;
};

interface OrbitIcon {
  component: () => ReactNode;
  className: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
}

// Ripple圆圈半径计算：mainCircleSize=600, 间距=120
// 第1圈: 600/2 = 300px
// 第2圈: (600+120)/2 = 360px
// 第3圈: (600+240)/2 = 420px
// 第4圈: (600+360)/2 = 480px
// 第5圈: (600+480)/2 = 540px

const iconsArray: OrbitIcon[] = [
  // 第1圈 (300px) - 内圈
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/chrome/chrome-original.svg'
        alt='Chrome'
      />
    ),
    className: 'size-[30px] border-none bg-transparent',
    duration: 20,
    delay: 0,
    radius: 300,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/selenium/selenium-original.svg'
        alt='Selenium'
      />
    ),
    className: 'size-[30px] border-none bg-transparent',
    duration: 20,
    delay: 10,
    radius: 300,
    path: false,
    reverse: false,
  },

  // 第2圈 (360px)
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/pytest/pytest-original.svg'
        alt='Pytest'
      />
    ),
    className: 'size-[35px] border-none bg-transparent',
    radius: 360,
    duration: 25,
    delay: 0,
    path: false,
    reverse: true,
  },
  {
    component: () => (
     <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cypressio/cypressio-original.svg'
        alt='cypressio'
      />
    ),
    className: 'size-[35px] border-none bg-transparent',
    duration: 25,
    delay: 12,
    radius: 360,
    path: false,
    reverse: true,
  },

  // 第3圈 (420px)
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/firefox/firefox-original.svg'
        alt='firefox'
      />
    ),
    className: 'size-[35px] border-none bg-transparent',
    radius: 420,
    duration: 30,
    delay: 0,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/android/android-original.svg'
        alt='android'
      />
    ),
    className: 'size-[30px] border-none bg-transparent',
    duration: 30,
    delay: 15,
    radius: 420,
    path: false,
    reverse: false,
  },

  // 第4圈 (480px)
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/puppeteer/puppeteer-original.svg'
        alt='puppeteer'
      />
    ),
    className: 'size-[35px] border-none bg-transparent',
    radius: 480,
    duration: 35,
    delay: 0,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/playwright/playwright-original.svg'
        alt='Playwright'
      />
    ),
    className: 'size-[35px] border-none bg-transparent',
    radius: 480,
    duration: 35,
    delay: 17,
    path: false,
    reverse: true,
  },

  // 第5圈 (540px) - 外圈
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src='/chatgpt.svg'
        alt='chatgpt'
      />
    ),
    className: 'size-[35px] border-none bg-transparent',
    radius: 540,
    duration: 40,
    delay: 0,
    path: false,
    reverse: false,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);



  // 邮箱验证函数
  const validateEmail = (email: string): string => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const goToForgotPassword = (
    event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    event.preventDefault();
    console.log('forgot password');
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    name: keyof FormData
  ) => {
    const value = event.target.value;

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    // 实时验证
    if (name === 'email') {
      const emailError = validateEmail(value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (emailError) {
          newErrors.Email = emailError;
        } else {
          delete newErrors.Email;
        }
        return newErrors;
      });
    } else if (name === 'password') {
      // 密码字段的实时验证
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (!value || value.trim() === '') {
          newErrors.Password = 'Password is required';
        } else {
          delete newErrors.Password;
        }
        return newErrors;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 清除之前的错误
    const newErrors: {[key: string]: string} = {};

    // 验证邮箱
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.Email = emailError;
    }

    // 验证密码
    if (!formData.password || formData.password.trim() === '') {
      newErrors.Password = 'Password is required';
    }

    // 如果有验证错误，显示错误并返回
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 开始登录流程
    setIsLoading(true);
    // 清除所有错误，因为基本验证已通过
    setErrors({});

    try {
      // 首先调用我们的自定义登录API进行详细验证
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        // 处理不同的HTTP状态码
        let errorMessage = loginData.message || 'Login failed';

        console.log('Login failed:', {
          status: loginResponse.status,
          data: loginData
        });

        if (loginResponse.status === 400) {
          errorMessage = loginData.message || 'Invalid input data';
        } else if (loginResponse.status === 401) {
          errorMessage = loginData.message || 'Invalid email or password';
        } else if (loginResponse.status === 403) {
          errorMessage = 'Access forbidden. Please contact administrator.';
        } else if (loginResponse.status === 429) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else if (loginResponse.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }

        setErrors({
          Email: errorMessage,
        });
        setIsLoading(false);
        return;
      }

      // 如果自定义API验证成功，使用NextAuth进行会话创建
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({
          Email: 'Authentication failed. Please try again.',
        });
      } else if (result?.ok) {
        // 登录成功，跳转到首页
        router.push('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // 处理网络错误等异常情况
      let errorMessage = 'Network error. Please check your connection and try again.';

      if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please try again later.';
      }

      setErrors({
        Email: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = {
    header: 'Welcome back',
    subHeader: 'Sign in to your account',
    fields: [
      {
        label: 'Email',
        required: true,
        type: 'email' as const,
        placeholder: 'Enter your email address',
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, 'email'),
        disabled: isLoading,
      },
      {
        label: 'Password',
        required: true,
        type: 'password' as const,
        placeholder: 'Enter your password',
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, 'password'),
        disabled: isLoading,
      },
    ],
    submitButton: isLoading ? 'Signing in...' : 'Sign in',
    textVariantButton: 'Forgot password?',
    externalErrors: errors,
    isLoading,
    disableInternalValidation: true, // 禁用内部验证，使用我们自己的验证逻辑
  };

  return (
    <AuthTabs
      formFields={formFields}
      goTo={goToForgotPassword}
      handleSubmit={handleSubmit}
      iconsArray={iconsArray}
    />
  );
}
