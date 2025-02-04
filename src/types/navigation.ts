export type RootTabParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: { signOut: () => void };
}; 