type Location = {
  latitude: number,
  longitude: number,
  time: number,
};

export default async (location: Location) => {
  console.log(JSON.stringify(location,null,2));
  return Promise.resolve();
};