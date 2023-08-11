import cn from 'classnames';
import { AvatarStack, CurrentSelectorSvg } from '.';
import { useContext } from 'react';
import { SpacesContext } from '.';
import { useMembers } from '../hooks';

import { releaseMyLocks } from '../utils/locking';

export interface SlidePreviewProps {
  children: React.ReactNode;
  index: number;
}

export const SlidePreview = ({ children, index }: SlidePreviewProps) => {
  const space = useContext(SpacesContext);
  const { self, members } = useMembers();
  const membersOnASlide = (members || []).filter(({ location }) => location?.slide === `${index}`);
  const isActive = self?.location?.slide === `${index}`;

  const handleSlideClick = async () => {
    if (!space || !self) return;

    await releaseMyLocks(space, self);
    space.locations.set({ slide: `${index}`, element: null });
  };

  return (
    <li
      data-id="slide-preview-list-item"
      className={cn('relative flex flex-row py-8 w-[1320px] rounded-tr-[20px] rounded-br-[20px] cursor-pointer', {
        'bg-[#EEE9FF]': isActive,
        'mb-[140px]': membersOnASlide.length > 0,
      })}
      onClick={handleSlideClick}
    >
      <div
        data-id="slide-preview-selected-indicator"
        className="pl-[45px] w-[25px] self-center"
      >
        {isActive && <CurrentSelectorSvg />}
      </div>
      <p
        data-id="slide-preview-number"
        className="text-7xl p-11 pl-[135px] text-ably-avatar-stack-demo-number-text self-center bg-transparent"
      >
        {index + 1}
      </p>
      <div
        data-id="slide-preview-container"
        className="relative rounded-[30px] border-2 border-ably-avatar-stack-demo-slide-preview-border w-[1020px] h-[687px] min-w-[1020px] min-h-[687px] bg-white pointer-events-none"
      >
        {children}
      </div>
      <AvatarStack
        isInContent
        avatars={membersOnASlide}
      />
    </li>
  );
};
