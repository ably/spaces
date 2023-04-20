import { createFragment } from '../utils/dom';
import { gradients } from '../utils/gradients';

const renderComments = () => {
  const commentData = [
    {
      name: 'Mark Harris',
      comment: 'Hey - that looks amazing! Can we make this title larger?',
      position: '#3 - Slide 2',
    },
    {
      name: 'Timmy Bahama',
      comment: 'Can we add some more text to this slide?',
      position: '#3 - Slide 2',
    },
    {
      name: 'Frankie B. Good',
      comment: 'I like this slide, but can we change the color of the text?',
      position: '#3 - Slide 3',
    },
  ];

  const commentContainer = document.querySelector('#comments-container') as HTMLElement;
  const commentDrawer = createFragment('#comment-drawer') as HTMLElement;
  const commentThreadContainer = commentDrawer.querySelector('ul[data-id=comment-thread-container]') as HTMLElement;

  commentContainer.appendChild(commentDrawer);

  commentData.forEach((comment, index) => {
    const commentThreadFragment = createFragment('#comment-thread') as HTMLElement;
    const commentThreadName = commentThreadFragment.querySelector('p[data-id=comment-thread-name]') as HTMLElement;
    const commentThreadComment = commentThreadFragment.querySelector(
      'p[data-id=comment-thread-comment]',
    ) as HTMLElement;
    const commentThreadPosition = commentThreadFragment.querySelector(
      'p[data-id=comment-thread-position]',
    ) as HTMLElement;
    const commentAvatar = commentThreadFragment.querySelector('span[data-id=comment-avatar]') as HTMLImageElement;

    commentThreadName.innerText = comment.name;
    commentThreadComment.innerText = comment.comment;
    commentThreadPosition.innerText = comment.position;

    const initials = comment.name
      .split(' ')
      .map((name) => name[0])
      .join('');
    commentAvatar.innerText = initials;
    commentAvatar.classList.add('bg-gradient-to-b', gradients[index][0], gradients[index][1]);

    commentThreadContainer.appendChild(commentThreadFragment);
  });
};

export { renderComments };
