import { useContext, useEffect } from 'react';

import {
  CommentDrawer,
  Header,
  SlideMenu,
  SpacesContext,
  Title,
  Paragraph,
  Image,
  CurrentSlide,
  Cursors,
} from './components';
import { getRandomName, getRandomColor } from './utils';
import { useMembers } from './hooks';

const App = () => {
  const space = useContext(SpacesContext);
  const { self, others } = useMembers();

  useEffect(() => {
    if (!space) return;

    const self = space.getSelf();

    if (self?.profileData.name) return;

    const enter = async () => {
      const name = getRandomName();
      await space.enter({ name, color: getRandomColor() });
      space.locations.set({ slide: 0, element: null });
    };

    enter();
  }, [space]);

  return (
    <>
      <Header
        self={self}
        others={others}
      />
      <div className="text-ably-charcoal-grey bg-slate-500">
        <main>
          <section
            id="feature-display"
            className="absolute gap-12 bg-[#F7F6F9] w-full h-[calc(100%-80px)] -z-10 overflow-y-hidden overflow-x-hidden flex justify-between min-w-[375px] xs:flex-col md:flex-row"
          >
            <SlideMenu slides={slides} />

            <section
              id="slide-selected"
              className="shadow-ably-paper xs:m-4 md:m-0 md:relative md:w-[1020px] md:h-[687px] md:min-w-[1020px] md:min-h-[687px] md:top-[79px] lg:mr-[380px]"
            >
              <CurrentSlide slides={slides} />
              <Cursors />
            </section>
            <CommentDrawer />
          </section>
        </main>
      </div>
    </>
  );
};

export default App;

const slides = [
  {
    children: (
      <div className="grid grid-cols-1 md:grid-cols-[390px_1fr] gap-8 h-full items-center p-8">
        <div>
          <Title
            id="1"
            className="md:mb-24"
          >
            Key Design Principles
          </Title>
          <Paragraph id="2">
            Effective design centres on four basic principles: contrast, repetition, alignment and proximity. These
            appear in every design.
          </Paragraph>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Image
            src="/contrast.svg"
            id="3"
          >
            <div className="absolute top-5 scale-50 md:scale-100 w-[176px] -left-8 md:top-20 md:left-6 md:right-6 md:mx-auto">
              <Title
                variant="h2"
                id="4"
              >
                Contrast
              </Title>
              <Paragraph
                variant="aside"
                id="5"
              >
                When a design uses several elements, the goal is to make each one distinct.
              </Paragraph>
            </div>
          </Image>
          <Image
            src="/repetition.svg"
            id="6"
          >
            <div className="absolute top-3 scale-50 md:scale-100 w-[176px] -left-8 md:top-20 md:left-6 md:right-6 md:mx-auto">
              <Title
                variant="h2"
                id="7"
              >
                Repetition
              </Title>
              <Paragraph
                variant="aside"
                id="8"
              >
                Repetition helps designers establish relationships, develop organization and strengthen unity.
              </Paragraph>
            </div>
          </Image>
          <Image
            src="/alignment.svg"
            id="9"
          >
            <div
              data-id="slide-figcaption-placeholder"
              className="absolute top-3 scale-50 md:scale-100 w-[176px] -left-8 md:top-20 md:left-6 md:right-6 md:mx-auto"
            >
              <Title
                variant="h2"
                id="10"
              >
                Alignment
              </Title>
              <Paragraph
                variant="aside"
                id="11"
              >
                Alignment creates a clean, sophisticated look. All elements should relate to all others in some way.
              </Paragraph>
            </div>
          </Image>
          <Image
            src="/proximity.svg"
            id="12"
          >
            <div
              data-id="slide-figcaption-placeholder"
              className="absolute top-3 scale-50 md:scale-100 w-[176px] -left-8 md:top-20 md:left-6 md:right-6 md:mx-auto"
            >
              <Title
                variant="h2"
                id="13"
              >
                Proximity
              </Title>
              <Paragraph
                variant="aside"
                id="14"
              >
                When items are grouped, they become a single visual unit, rather than several separate entities.
              </Paragraph>
            </div>
          </Image>
        </div>
      </div>
    ),
  },
  {
    children: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center p-8 relative">
        <div>
          <Title
            variant="h3"
            id="1"
          >
            How users read
          </Title>
          <Title
            variant="h1"
            className="mb-12"
            id="2"
          >
            Add graphics
          </Title>
          <Paragraph
            className="!mb-8"
            id="3"
          >
            No one likes boring text blocks on a website. And{' '}
            <span className="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">images and icons</span>{' '}
            are the fastest way to get information.
          </Paragraph>
          <Paragraph id="4">
            But <span className="text-ably-avatar-stack-demo-slide-title-highlight font-semibold">don't overdo it</span>
            . If you can't explain for what purpose you put this line or icon, it's better to abandon it.
          </Paragraph>
        </div>
        <Image
          src="/collaborative-document.svg"
          className="absolute w-72 -right-1 md:-right-4 md:w-[477px]"
          id="5"
        />
      </div>
    ),
  },
  {
    children: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center p-8">
        <div>
          <Title
            variant="h1"
            className="mb-12"
            id="1"
          >
            Design Statistics
          </Title>
          <Paragraph
            className="md:!mb-[350px]"
            id="2"
          >
            How do SMBs rate the importance of graphic design to their success?
          </Paragraph>
        </div>
        <Image
          src="/bubble-diagram.svg"
          className="absolute md:w-[688px] md:right-60 md:top-20"
          id="3"
        />
      </div>
    ),
  },
];
