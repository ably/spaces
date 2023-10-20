import { FormEvent, useContext, useRef } from 'react';
import cn from 'classnames';

import { NameModalContext, SpacesContext } from '.';
import { Member } from '../utils/types';
import { getRandomColor } from '../utils';

interface Props {
  self?: Member;
}

export const Modal = ({ self }: Props) => {
  const space = useContext(SpacesContext);
  const { isModalVisible, setIsModalVisible } = useContext(NameModalContext);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!space || !isModalVisible) return;

    space.updateProfileData({ name: inputRef.current?.value, color: getRandomColor() });
    setIsModalVisible(false);
  };

  return (
    <div
      className={cn('fixed top-0 left-0 w-full h-full transition-all duration-300 flex items-center justify-center', {
        'opacity-0 pointer-events-none': !isModalVisible,
        'opacity-100': isModalVisible,
      })}
    >
      <div
        onClick={() => setIsModalVisible(false)}
        className={cn('backdrop-blur-md bg-black/30 fixed top-0 left-0 w-full h-full')}
      ></div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 shadow-lg rounded-[20px] fixed m-auto"
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
