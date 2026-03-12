const API = "http://localhost:5000/api";

export const getPosters = async () => {
  const res = await fetch(`${API}/posters`);
  return res.json();
};
