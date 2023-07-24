import { Avatar } from './Avatar';
import { ReplyStackSvg } from './svg';

interface Props {
  name: string;
  position: string;
  comment: string;
  replies: number;
}

export const Comment = ({ name, position, comment, replies }: Props) => {
  return (
    <div>
      <div className="flex mb-2 gap-3">
        <Avatar name={name} />
        <div>
          <p
            data-id="comment-thread-name"
            className="font-semibold"
          >
            {name}
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
