import { Avatar } from './Avatar';

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
        <svg
          width="23"
          height="16"
          viewBox="0 0 23 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 6.33594L8.80627 6.33594"
            stroke="#3E3E3E"
            stroke-width="0.84188"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M16.6641 6.33594L21.1541 6.33594"
            stroke="#3E3E3E"
            stroke-width="0.84188"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M16.6641 13.0708L21.1541 13.0708"
            stroke="#3E3E3E"
            stroke-width="0.84188"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M8.80627 13.0708H7.99557C6.99778 13.0708 6 12.073 6 11.0752V1.8457"
            stroke="#3E3E3E"
            stroke-width="0.84188"
            stroke-linecap="round"
          />
          <circle
            cx="12.7345"
            cy="6.33562"
            r="1.68376"
            stroke="#3E3E3E"
            stroke-width="0.84188"
            stroke-linecap="round"
          />
          <circle
            cx="12.7345"
            cy="13.071"
            r="1.68376"
            stroke="#3E3E3E"
            stroke-width="0.84188"
            stroke-linecap="round"
          />
        </svg>
        {replies} replies
      </button>
    </div>
  );
};
