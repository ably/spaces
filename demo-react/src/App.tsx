import { useContext, useEffect, useState } from 'react';
import { ComingSoon, CommentDrawer, Header, SlideMenu } from './components';
import SpacesContext from './components/SpacesContext';
import { getRandomName } from './utils/fake-names';
import { useMembers } from './hooks';

const App = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const space = useContext(SpacesContext);
  const { self, members, others } = useMembers();

  useEffect(() => {
    if (!space) return;

    const self = space.getSelf();

    if (self?.profileData.name) return;

    const enter = async () => {
      await space.enter({ name: getRandomName() });
      space.locations.set({ slide: 0, element: null });
    }

    enter();
  }, [space])


  return (
    <>
      <Header self={self} others={others} />
      <div className="text-ably-charcoal-grey bg-slate-500">
        <main>
          <ComingSoon />

          <section
            id="feature-display"
            className="absolute gap-12 bg-[#F7F6F9] w-full h-[calc(100%-80px)] -z-10 overflow-y-hidden overflow-x-hidden flex justify-between min-w-[375px] xs:flex-col md:flex-row"
          >
            <SlideMenu
              activeSlide={activeSlide}
              setActiveSlide={setActiveSlide}
              slides={slides}
            />

            <section
              id="slide-selected"
              className="shadow-ably-paper xs:m-4 md:m-0 md:relative md:w-[1020px] md:h-[687px] md:min-w-[1020px] md:min-h-[687px] md:top-[79px] lg:mr-[380px]"
            >
              <div
                data-id="slide-wrapper"
                className="flex flex-col justify-between px-8 py-8 md:h-full md:w-full"
              ></div>
              <div
                data-id="slide-cursor-container"
                className="h-full w-full z-10 pointer-events-none top-0 left-0 hidden absolute md:block"
              ></div>
            </section>

            <CommentDrawer />
          </section>
        </main>
      </div>
    </>
  );
}

export default App;

const slides = [
  {
    children: <>Slide 1</>,
  },
  {
    children: <>Slide 2</>,
  },
  {
    children: <>Slide 3</>,
  },
];
