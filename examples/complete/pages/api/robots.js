const content = `# Example robots.txt

User-agent: *
Allow: /

Sitemap: http://www.example.com/sitemap.xml`;

const RobotsHandler = (_req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(content);
};

export default RobotsHandler;
