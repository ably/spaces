import { Comment } from './Comment';

export const CommentDrawer = () => {
  return (
    <section id="comments-container">
      <aside className="absolute w-[354px] h-full bg-white right-0 top-0 p-8 hidden lg:block">
        <div className="flex flex-row justify-between">
          <h3 className="text-xl font-medium mb-14">Comments</h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M0.852252 0.852252C1.07192 0.632583 1.42808 0.632583 1.64775 0.852252L8 7.2045L14.3523 0.852252C14.5719 0.632583 14.9281 0.632583 15.1477 0.852252C15.3674 1.07192 15.3674 1.42808 15.1477 1.64775L8.7955 8L15.1477 14.3523C15.3674 14.5719 15.3674 14.9281 15.1477 15.1477C14.9281 15.3674 14.5719 15.3674 14.3523 15.1477L8 8.7955L1.64775 15.1477C1.42808 15.3674 1.07192 15.3674 0.852252 15.1477C0.632583 14.9281 0.632583 14.5719 0.852252 14.3523L7.2045 8L0.852252 1.64775C0.632583 1.42808 0.632583 1.07192 0.852252 0.852252Z"
              fill="#03020D"
            />
          </svg>
        </div>
        <ul data-id="comment-thread-container">
          {comments.map((comment, index) => (
            <li
              key={`comment-${index}`}
              className="mb-8"
            >
              <Comment {...comment} />
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
};

const comments = [
  {
    name: 'Mark Harris',
    position: '#3 - Slide 2',
    comment: 'Hey - that looks amazing! Can we make this title larger?',
    replies: 2,
  },
  {
    name: 'Timmy Bahama',
    position: '#3 - Slide 2',
    comment: 'Can we add some more text to this slide?',
    replies: 3,
  },
  {
    name: 'Frankie B. Good',
    position: '#3 - Slide 3',
    comment: 'I like this slide, but can we change the color of the text?',
    replies: 2,
  },
];
