/**
 * Vercel Serverless Function
 * Fetches latest deployment dates for all game projects
 */

const PROJECTS = [
  { id: 'nageex', name: 'nageex' },
  { id: 'island-crisis-3d', name: 'island-crisis' },
  { id: 'island-crisis-2d', name: 'phaser-island-crisis' },
  { id: 'thumb-game', name: 'thumb-game' },
  { id: 'wario-clone', name: 'wario-clone' }
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store, s-maxage=60, stale-while-revalidate=30');

  const token = process.env.VERCEL_API_TOKEN;
  
  if (!token) {
    return res.status(500).json({ error: 'VERCEL_API_TOKEN not configured' });
  }

  try {
    const deployments = await Promise.all(
      PROJECTS.map(async (project) => {
        try {
          const response = await fetch(
            `https://api.vercel.com/v6/deployments?projectId=${project.name}&limit=1&state=READY&target=production`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          if (!response.ok) {
            // Try with team scope if personal didn't work
            const teamResponse = await fetch(
              `https://api.vercel.com/v6/deployments?name=${project.name}&limit=1&state=READY&target=production`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            
            if (!teamResponse.ok) {
              console.error(`Failed to fetch ${project.name}:`, await teamResponse.text());
              return { id: project.id, lastUpdate: null };
            }
            
            const teamData = await teamResponse.json();
            const deployment = teamData.deployments?.[0];
            return {
              id: project.id,
              lastUpdate: deployment?.createdAt || null
            };
          }

          const data = await response.json();
          const deployment = data.deployments?.[0];
          
          return {
            id: project.id,
            lastUpdate: deployment?.createdAt || null
          };
        } catch (err) {
          console.error(`Error fetching ${project.name}:`, err);
          return { id: project.id, lastUpdate: null };
        }
      })
    );

    return res.status(200).json({ deployments });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch deployments' });
  }
}
