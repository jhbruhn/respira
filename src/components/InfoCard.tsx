import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

import { cn } from "@/lib/utils";

const infoCardVariants = cva("border-l-4 p-4 rounded-lg backdrop-blur-sm", {
  variants: {
    variant: {
      info: "bg-info-50 dark:bg-info-900/95 border-info-600 dark:border-info-500",
      warning:
        "bg-warning-50 dark:bg-warning-900/95 border-warning-600 dark:border-warning-500",
      error:
        "bg-danger-50 dark:bg-danger-900/95 border-danger-600 dark:border-danger-500",
      success:
        "bg-success-50 dark:bg-success-900/95 border-success-600 dark:border-success-500",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const iconColorVariants = cva("w-6 h-6 flex-shrink-0 mt-0.5", {
  variants: {
    variant: {
      info: "text-info-600 dark:text-info-400",
      warning: "text-warning-600 dark:text-warning-400",
      error: "text-danger-600 dark:text-danger-400",
      success: "text-success-600 dark:text-success-400",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const titleColorVariants = cva("text-base font-semibold mb-2", {
  variants: {
    variant: {
      info: "text-info-900 dark:text-info-200",
      warning: "text-warning-900 dark:text-warning-200",
      error: "text-danger-900 dark:text-danger-200",
      success: "text-success-900 dark:text-success-200",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const descriptionColorVariants = cva("text-sm mb-3", {
  variants: {
    variant: {
      info: "text-info-800 dark:text-info-300",
      warning: "text-warning-800 dark:text-warning-300",
      error: "text-danger-800 dark:text-danger-300",
      success: "text-success-800 dark:text-success-300",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const listColorVariants = cva("text-sm", {
  variants: {
    variant: {
      info: "text-info-700 dark:text-info-300",
      warning: "text-warning-700 dark:text-warning-300",
      error: "text-danger-700 dark:text-danger-300",
      success: "text-success-700 dark:text-success-300",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

interface InfoCardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof infoCardVariants> {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  showDefaultIcon?: boolean;
}

function InfoCard({
  className,
  variant = "info",
  icon: CustomIcon,
  showDefaultIcon = true,
  children,
  ...props
}: InfoCardProps) {
  // Default icons based on variant
  const defaultIcons = {
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon,
    success: CheckCircleIcon,
  } as const;

  const Icon =
    CustomIcon || (showDefaultIcon && variant ? defaultIcons[variant] : null);

  return (
    <div className={cn(infoCardVariants({ variant }), className)} {...props}>
      <div className="flex items-start gap-3">
        {Icon && <Icon className={iconColorVariants({ variant })} />}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function InfoCardTitle({
  className,
  variant = "info",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof titleColorVariants>) {
  return (
    <h3 className={cn(titleColorVariants({ variant }), className)} {...props} />
  );
}

function InfoCardDescription({
  className,
  variant = "info",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> &
  VariantProps<typeof descriptionColorVariants>) {
  return (
    <p
      className={cn(descriptionColorVariants({ variant }), className)}
      {...props}
    />
  );
}

interface InfoCardListProps
  extends
    React.HTMLAttributes<HTMLOListElement | HTMLUListElement>,
    VariantProps<typeof listColorVariants> {
  ordered?: boolean;
}

function InfoCardList({
  className,
  variant = "info",
  ordered = false,
  children,
  ...props
}: InfoCardListProps) {
  const ListComponent = ordered ? "ol" : "ul";
  const listClass = ordered ? "list-decimal" : "list-disc";

  return (
    <ListComponent
      className={cn(
        listClass,
        "list-inside space-y-1.5",
        listColorVariants({ variant }),
        className,
      )}
      {...props}
    >
      {children}
    </ListComponent>
  );
}

function InfoCardListItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("pl-2", className)} {...props} />;
}

export {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardList,
  InfoCardListItem,
};
