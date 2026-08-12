# =============================================================================
#  Front Alryck : build Vite, puis nginx qui sert le resultat
# =============================================================================
#  L'adresse de l'API est figee A LA CONSTRUCTION. Vite substitue les import.meta.env dans le
#  bundle : il n'y a plus de variable a l'execution, et changer d'API suppose de reconstruire
#  l'image. C'est le prix d'un front statique, et c'est aussi ce qui evite qu'une mauvaise
#  configuration en ligne fasse taper la production sur une base de recette.
#
#    docker build --build-arg VITE_ALRYCK_API=https://api.alryck-dev.geo2i.com -t alryck-front:dev .
# =============================================================================

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /src

# npm ci et non npm install : il installe exactement le contenu du verrou, sans le reecrire.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_ALRYCK_API=https://api.alryck-dev.geo2i.com
ENV VITE_ALRYCK_API=${VITE_ALRYCK_API}
RUN npm run build

# ---------- image finale ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS final
LABEL org.opencontainers.image.source=https://github.com/barns05/Alryck_front

# Image non privilegiee : nginx ecoute sur 8080 et tourne en uid 101, sans capacite
# supplementaire. Un serveur de fichiers statiques n'a aucune raison d'etre root.
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
