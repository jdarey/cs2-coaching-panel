export default async function handler(req, res) {
  try {
    const nickname = "jdareyy";

    const response = await fetch(
      `https://www.faceit.com/api/users/v1/nicknames/${nickname}`
    );

    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "FACEIT fetch failed" });
  }
}