import { Avatar } from './Avatar';
import { AvatarStack } from './AvatarStack';
import { ExternalLinkSvg, InfoSvg } from './svg';
import { type Member } from '../utils/types';
import { getParamNameFromUrl } from '../utils';

interface Props {
  self?: Member;
  others?: Member[];
}

export const Header = ({ self, others }: Props) => {
  const teamName = getParamNameFromUrl('team', 1, '');
  const formattedTeamName = teamName?.replace(/-/g, ' ');

  return (
    <header
      id="main-header"
      className="bg-white"
    >
      <div className="mx-auto justify-between grid grid-rows-2 grid-cols-2 max-w-screen-2xl md:px-8 lg:px-16 md:flex md:items-center">
        <section className="py-4 shrink-0 mr-4">
          <p className="font-semibold pl-8 md:text-2xl capitalize">Team {formattedTeamName ?? 'Argo'}</p>
          <p className="leading-5 pl-8">Pitch deck</p>
        </section>

        <section className="ml-auto group relative pr-8 py-4 group-hover cursor-pointer flex">
          <InfoSvg className="text-ably-black self-center shrink-0" />
          <p className="ml-2 font-medium text-sm lg:text-base self-center">How to try this demo</p>
          <div className="p-4 bg-[#FAFAFB] rounded-lg hidden group-hover:block absolute top-[50px] mt-2 w-[300px] -left-[100px] md:-left-[50px] border border-[#D9D9DA] text-sm z-20">
            Open this page in multiple windows or share the URL with your team to try out the live avatar stack.
          </div>
        </section>

        <section
          id="avatar-stack-container"
          className="flex justify-end items-baseline col-span-2 border-t border-[#D9D9DA] md:border-t-0 p-4"
        >
          <>
            {self && (
              <Avatar
                isSelf
                {...self}
              />
            )}
            {others && others.length > 0 && <AvatarStack avatars={others} />}
          </>
        </section>

        <section className="hidden md:flex md:items-center">
          <a
            href="https://github.com/ably-labs/spaces"
            target="_blank"
            className="flex items-center px-5 py-[14px] justify-start shrink-0"
            rel="noreferrer"
          >
            <p className="font-medium text-base">Space API</p>
            <ExternalLinkSvg className="ml-[10px]" />
          </a>

          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSer2ujLNw0rlrf2FvfIhLxyiWuuvTwYkDDqHmv30F8Cs00YWg/viewform"
            className="w-[100px] text-white bg-ably-black rounded-md py-[11px] px-5 leading-[1.125] md:text-xs lg:text-base lg:ml-[24px] shrink-0 hidden lg:block"
          >
            Sign Up
          </a>
        </section>
      </div>
    </header>
  );
};
