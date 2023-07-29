import { SpaceMember } from '@ably-labs/spaces';
import { Avatar } from './Avatar';
import { ReplyStackSvg } from './svg';

export interface CommentProps extends SpaceMember {
  position: string;
  comment: string;
  replies: number;
}

export const Comment = ({ position, comment, replies, profileData, ...memberProps }: CommentProps) => {
  return (
    <div>
      <div className="flex mb-2 gap-3">
        <Avatar
          profileData={profileData}
          {...memberProps}
        />
        <div>
          <p
            data-id="comment-thread-name"
            className="font-semibold"
          >
            {profileData.name}
          </p>
          <p
            data-id="comment-thread-position"
            className="text-xs text-gray-500"
          >
            {position}
          </p>
        </div>
      </div>
      <p
        data-id="comment-thread-comment"
        className="text-xs text-gray-500 mb-1"
      >
        {comment}
      </p>
      <button className="flex flex-row gap-[3px] text-xs items-center text-gray-500">
        <ReplyStackSvg />
        {replies} replies
      </button>
    </div>
  );
};
