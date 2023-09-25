import { FormEvent, useContext, useRef } from 'react';
import cn from 'classnames';

import { SpacesContext } from '.';
import { Member } from '../utils/types';
import { getRandomColor } from '../utils';

interface Props {
  self?: Member;
  isVisible?: boolean;
  setIsVisible?: (isVisible: boolean) => void;
}

export const Modal = ({ isVisible = false, setIsVisible, self }: Props) => {
  const space = useContext(SpacesContext);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!space || !setIsVisible) return;

    space.updateProfileData({ name: inputRef.current?.value, color: getRandomColor() });
    setIsVisible(false);
  };

  return (
    <div
      className={cn(
        'backdrop-blur-md bg-black/30 fixed top-0 left-0 w-full h-full flex items-center justify-center transition-all duration-300',
        {
          'opacity-0 pointer-events-none': !isVisible,
          'opacity-100': isVisible,
        },
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 shadow-lg rounded-[20px]"
      >
        <h3 className="font-semibold text-xl text-center mb-8">Enter your name</h3>
        <input
          ref={inputRef}
          className="border border-gray-300 rounded-md p-2 w-full"
          defaultValue={self?.profileData?.name}
        />
        <button
          type="submit"
          className="bg-ably-black text-white rounded-md p-2 w-full mt-4"
        >
          Set name
        </button>
      </form>
    </div>
  );
};
