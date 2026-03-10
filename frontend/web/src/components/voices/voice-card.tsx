import { ThumbsUp, ThumbsDown, MessageCircle, MapPin, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Voice } from "@/types";

interface VoiceCardProps {
  voice: Voice;
}

const typeVariants: Record<string, "default" | "saffron" | "success" | "error" | "warning" | "info"> = {
  opinion: "info",
  suggestion: "saffron",
  complaint: "error",
  appreciation: "success",
  question: "warning",
};

export function VoiceCard({ voice }: VoiceCardProps) {
  return (
    <Card className="group">
      <div className="flex items-start gap-3">
        {voice.isAnonymous ? (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-400" />
          </div>
        ) : (
          <Avatar name={voice.author.name} src={voice.author.avatar} size="md" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 text-sm">
              {voice.isAnonymous ? "Anonymous Citizen" : voice.author.name}
            </span>
            <Badge variant={typeVariants[voice.type] ?? "default"}>{voice.type}</Badge>
            <span className="text-xs text-gray-400">{formatRelativeTime(voice.createdAt)}</span>
          </div>

          <p className="text-gray-700 text-sm leading-relaxed">{voice.content}</p>

          {voice.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {voice.tags.map((tag) => (
                <span key={tag} className="text-xs text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {voice.location && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>{voice.location.city}, {voice.location.state}</span>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3">
            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-success transition-colors">
              <ThumbsUp className="w-4 h-4" />
              <span>{voice.upvotes}</span>
            </button>
            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-error transition-colors">
              <ThumbsDown className="w-4 h-4" />
              <span>{voice.downvotes}</span>
            </button>
            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-info transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{voice.commentCount}</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
