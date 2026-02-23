import { type HTMLAttributes, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

import { Badge, type BadgeVariant, type BadgeSize } from '../Badge'

export type StatusType = 'completed' | 'in_progress' | 'pending' | 'error'

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: StatusType
  size?: BadgeSize
  showIcon?: boolean
  showLabel?: boolean
  labels?: Partial<Record<StatusType, string>>
}

const statusConfig: Record<StatusType, {
  variant: BadgeVariant
  icon: typeof CheckCircle
  i18nKey: string
}> = {
  completed: {
    variant: 'success',
    icon: CheckCircle,
    i18nKey: 'status.completed',
  },
  in_progress: {
    variant: 'warning',
    icon: Clock,
    i18nKey: 'status.inProgress',
  },
  pending: {
    variant: 'error',
    icon: AlertCircle,
    i18nKey: 'status.pending',
  },
  error: {
    variant: 'error',
    icon: AlertCircle,
    i18nKey: 'status.error',
  },
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    {
      status,
      size = 'sm',
      showIcon = true,
      showLabel = true,
      labels,
      className,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation()
    const config = statusConfig[status]
    const Icon = config.icon
    const label = labels?.[status] ?? t(config.i18nKey)

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size={size}
        icon={showIcon ? <Icon /> : undefined}
        className={className}
        {...props}
      >
        {showLabel && label}
      </Badge>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'
