import { useSpace } from '../hooks';
import { Avatar } from './Avatar';
import { AvatarStack } from './AvatarStack';
import { ExternalLinkSvg, InfoSvg } from './svg';

export const Header = () => {
  const { self, members } = useSpace();

  return (
    <header
      id="main-header"
      className="bg-white"
    >
      <div className="py-4 mx-auto xs:justify-between xs:grid xs:grid-rows-2 xs:grid-cols-2 md:max-w-screen-2xl md:px-16 md:flex md:items-center">
        <section>
          <p className="font-semibold pl-8 md:text-2xl">Team Argo</p>
          <p className="leading-5 pl-8">Pitch deck</p>
        </section>

        <section className="ml-auto flex group relative pr-8 xs:mt-2 md:mt-0">
          <InfoSvg className="text-ably-black" />
          <p className="ml-2 xs:text-sm md:font-medium md:text-base">How to try this demo</p>
          <div className="group-hover p-4 bg-[#FAFAFB] rounded-lg hidden group-hover:block absolute top-full mt-2 w-[300px] -left-[70%] border border-[#D9D9DA] xs:text-xs md:text-sm">
            Open this page in multiple windows or share the URL with your team to try out the live avatar stack.
          </div>
        </section>
        <section
          id="avatar-stack-container"
          className="flex justify-end col-span-2 mt-2 pt-2 xs:border-t xs:border-[#D9D9DA] xs:ml-0 xs:pr-8 md:ml-8 md:border-t-0"
        >
          <>
            {self && (
              <Avatar
                isSelf
                {...self}
              />
            )}
            {members && members.length > 0 && <AvatarStack avatars={members} />}
          </>
        </section>

        <section className="xs:hidden md:ml-[24px] md:flex md:items-center">
          <a
            href="https://github.com/ably-labs/spaces"
            target="_blank"
            className="flex items-center px-5 py-[14px] justify-start"
            rel="noreferrer"
          >
            <p className="font-medium text-base">Space API</p>
            <ExternalLinkSvg className="ml-[10px]" />
          </a>

          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSer2ujLNw0rlrf2FvfIhLxyiWuuvTwYkDDqHmv30F8Cs00YWg/viewform"
            className="text-white bg-ably-black rounded-md py-[11px] px-5 leading-[1.125] md:text-xs lg:text-base inline-block lg:ml-[24px]"
          >
            Sign Up
          </a>
        </section>
      </div>
    </header>
  );
};
