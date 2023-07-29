import { getRandomColor } from '../utils';
import { Comment, CommentProps } from './Comment';
import { CrossSvg } from './svg';

export const CommentDrawer = () => {
  return (
    <section id="comments-container">
      <aside className="absolute w-[354px] h-full bg-white right-0 top-0 p-8 hidden lg:block">
        <div className="flex flex-row justify-between">
          <h3 className="text-xl font-medium mb-14">Comments</h3>
          <CrossSvg />
        </div>
        <ul data-id="comment-thread-container">
          {comments.map((comment, index) => (
            <li
              key={`comment-${index}`}
              className="mb-8"
            >
              <Comment {...(comment as CommentProps)} />
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
};

const comments = [
  {
    clientId: 'KTP2FhfxsugPrNC8-O4MK',
    connectionId: 'yaQPVJza3n',
    isConnected: true,
    lastEvent: { name: 'update', timestamp: 1690491054522 },
    location: undefined,
    profileData: { name: 'Mark Harris', color: getRandomColor() },
    position: '#3 - Slide 2',
    comment: 'Hey - that looks amazing! Can we make this title larger?',
    replies: 2,
  },

  {
    clientId: 'KTP2FhfxsugPrNC8-O4MK',
    connectionId: 'yaQPVJza3n',
    isConnected: true,
    lastEvent: { name: 'update', timestamp: 1690491054522 },
    location: undefined,
    profileData: { name: 'Timmy Bahama', color: getRandomColor() },
    position: '#3 - Slide 2',
    comment: 'Can we add some more text to this slide?',
    replies: 3,
  },
  {
    clientId: 'KTP2FhfxsugPrNC8-O4MK',
    connectionId: 'yaQPVJza3n',
    isConnected: true,
    lastEvent: { name: 'update', timestamp: 1690491054522 },
    location: undefined,
    profileData: {
      name: 'Frankie B. Good',
      color: getRandomColor(),
    },
    position: '#3 - Slide 3',
    comment: 'I like this slide, but can we change the color of the text?',
    replies: 2,
  },
];
