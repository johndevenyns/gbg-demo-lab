import { ResultPageConfig } from '@/components/preview/ResultPage';

/**
 * Generate branded default result pages based on demo configuration
 */
export function generateDefaultResultPages(
  customerName: string,
  buttonColor?: string
): { successPage: ResultPageConfig; failurePage: ResultPageConfig } {
  const successPage: ResultPageConfig = {
    type: 'success',
    title: 'Verification Complete',
    subtitle: `Welcome to ${customerName}`,
    message: 'Your identity has been successfully verified. You can now proceed with your application.',
    showIcon: true,
    buttonText: 'Continue',
    showReferenceId: true,
  };

  const failurePage: ResultPageConfig = {
    type: 'failure',
    title: 'Verification Unsuccessful',
    subtitle: 'We were unable to verify your identity',
    message: `We couldn't complete your verification at this time. Please review your information and try again, or contact ${customerName} support for assistance.`,
    showIcon: true,
    buttonText: 'Try Again',
    showReferenceId: true,
  };

  return { successPage, failurePage };
}

/**
 * Industry-specific result page templates
 */
export const INDUSTRY_RESULT_PAGES: Record<string, { successPage: Partial<ResultPageConfig>; failurePage: Partial<ResultPageConfig> }> = {
  bank: {
    successPage: {
      title: 'Account Verification Complete',
      subtitle: 'Your identity has been confirmed',
      message: 'Thank you for verifying your identity. Your account is now ready to use. You can proceed to set up your banking preferences.',
      buttonText: 'Continue to Dashboard',
    },
    failurePage: {
      title: 'Verification Required',
      subtitle: 'Additional information needed',
      message: 'We were unable to verify your identity with the information provided. Please visit your nearest branch with a valid government-issued ID to complete the verification process.',
      buttonText: 'Find a Branch',
    },
  },
  rental_car: {
    successPage: {
      title: 'Driver Verified',
      subtitle: "You're ready to hit the road!",
      message: 'Your identity and driver credentials have been verified. You can now complete your vehicle reservation.',
      buttonText: 'Complete Booking',
    },
    failurePage: {
      title: 'Verification Issue',
      subtitle: 'We need to verify your driver information',
      message: "We couldn't verify your driver credentials. Please ensure your driver's license is valid and clearly visible, then try again.",
      buttonText: 'Retry Verification',
    },
  },
  online_gambling: {
    successPage: {
      title: 'Age & Identity Verified',
      subtitle: 'Welcome to the game!',
      message: 'Your age and identity have been confirmed. You can now access all gaming features. Please gamble responsibly.',
      buttonText: 'Start Playing',
    },
    failurePage: {
      title: 'Verification Failed',
      subtitle: 'Age verification required',
      message: 'We were unable to verify that you meet the minimum age requirements. Please ensure your information is accurate and try again.',
      buttonText: 'Try Again',
    },
  },
  healthcare: {
    successPage: {
      title: 'Identity Confirmed',
      subtitle: 'Your healthcare profile is ready',
      message: 'Your identity has been verified successfully. You can now access your patient portal and health records.',
      buttonText: 'Access Patient Portal',
    },
    failurePage: {
      title: 'Verification Needed',
      subtitle: 'We need to confirm your identity',
      message: 'For your security, we need additional verification. Please contact our patient services team or visit our office with a valid ID.',
      buttonText: 'Contact Support',
    },
  },
  insurance: {
    successPage: {
      title: 'Application Verified',
      subtitle: 'Your policy is being processed',
      message: 'Your identity has been verified and your insurance application is now being processed. You will receive confirmation shortly.',
      buttonText: 'View Application Status',
    },
    failurePage: {
      title: 'Verification Incomplete',
      subtitle: 'Additional documentation required',
      message: 'We were unable to verify your identity automatically. Please contact our support team to complete your application manually.',
      buttonText: 'Contact Support',
    },
  },
  retail: {
    successPage: {
      title: 'Account Verified',
      subtitle: 'Welcome to the family!',
      message: 'Your account has been verified. Enjoy exclusive member benefits and personalized shopping experiences.',
      buttonText: 'Start Shopping',
    },
    failurePage: {
      title: 'Verification Issue',
      subtitle: 'We need a bit more information',
      message: 'We were unable to verify your account information. Please update your details and try again.',
      buttonText: 'Update Information',
    },
  },
  custom: {
    successPage: {},
    failurePage: {},
  },
};

/**
 * Generate industry-specific branded result pages
 */
export function generateIndustryResultPages(
  customerName: string,
  industryTemplate: string,
  buttonColor?: string
): { successPage: ResultPageConfig; failurePage: ResultPageConfig } {
  const base = generateDefaultResultPages(customerName, buttonColor);
  const industryOverrides = INDUSTRY_RESULT_PAGES[industryTemplate] || INDUSTRY_RESULT_PAGES.custom;

  return {
    successPage: {
      ...base.successPage,
      ...industryOverrides.successPage,
    },
    failurePage: {
      ...base.failurePage,
      ...industryOverrides.failurePage,
    },
  };
}
