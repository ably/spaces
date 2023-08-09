import { type SpaceMember } from '../../../src';

interface ProfileData {
  name: string;
  color: {
    name: string;
    gradientStart: {
      tw: string;
      intensity: string;
      hex: string;
    };
    gradientEnd: {
      tw: string;
      intensity: string;
      hex: string;
    };
  };
}

type Member = Omit<SpaceMember, 'location' | 'profileData'> & {
  profileData: ProfileData;
  location: { slide: string; element: string };
};

export { ProfileData, Member };
