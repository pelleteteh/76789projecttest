import { Challenge } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Zap } from 'lucide-react';

interface ChallengeStatusBadgeProps {
  challenge: Challenge;
}

export function ChallengeStatusBadge({ challenge }: ChallengeStatusBadgeProps) {
  // P2P challenges
  if (!challenge.adminCreated) {
    switch (challenge.status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'active':
        return (
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100">
            <Zap className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {challenge.status}
          </Badge>
        );
    }
  }

  // Admin challenges
  return (
    <Badge variant="outline" className="capitalize">
      {challenge.status}
    </Badge>
  );
}
