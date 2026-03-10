import Link from "next/link";
import { MapPin, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { ScoreRing } from "@/components/ui/score-ring";
import type { Leader } from "@/types";

interface LeaderCardProps {
  leader: Leader;
}

export function LeaderCard({ leader }: LeaderCardProps) {
  return (
    <Link href={`/dashboard/leaders/${leader.id}`}>
      <Card hoverable className="group">
        <div className="flex items-start gap-4">
          <Avatar name={leader.name} src={leader.avatar} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-saffron transition-colors truncate">
                {leader.name}
              </h3>
              {leader.isVerified && (
                <CheckCircle className="w-4 h-4 text-info flex-shrink-0" />
              )}
            </div>

            <p className="text-sm text-gray-600">{leader.designation}</p>

            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{leader.constituency}, {leader.state}</span>
            </div>

            {leader.party && (
              <Badge variant="info" className="mt-2">{leader.party}</Badge>
            )}

            <div className="mt-3">
              <StarRating rating={leader.rating.overall} size={14} />
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{leader.issuesResolved}/{leader.issuesTotal} issues resolved</span>
              <span>{leader.promisesKept}/{leader.promisesTotal} promises kept</span>
            </div>
          </div>

          <ScoreRing score={leader.chi} label="CHI" size={64} strokeWidth={5} />
        </div>
      </Card>
    </Link>
  );
}
