#!/bin/sh
set -eu

: "${ICECAST_SOURCE_PASSWORD:?ICECAST_SOURCE_PASSWORD is required}"
: "${ICECAST_ADMIN_PASSWORD:?ICECAST_ADMIN_PASSWORD is required}"
: "${ICECAST_RELAY_PASSWORD:?ICECAST_RELAY_PASSWORD is required}"

umask 077
cat > /data/icecast.xml <<EOF
<icecast>
  <location>BlockTek Radio</location>
  <admin>operator@localhost</admin>
  <limits>
    <clients>${ICECAST_MAX_CLIENTS:-100}</clients>
    <sources>${ICECAST_MAX_SOURCES:-2}</sources>
    <threadpool>5</threadpool>
    <queue-size>524288</queue-size>
    <client-timeout>30</client-timeout>
    <header-timeout>15</header-timeout>
    <source-timeout>10</source-timeout>
    <burst-on-connect>1</burst-on-connect>
    <burst-size>65535</burst-size>
  </limits>
  <authentication>
    <source-password>${ICECAST_SOURCE_PASSWORD}</source-password>
    <relay-password>${ICECAST_RELAY_PASSWORD}</relay-password>
    <admin-user>${ICECAST_ADMIN_USERNAME:-admin}</admin-user>
    <admin-password>${ICECAST_ADMIN_PASSWORD}</admin-password>
  </authentication>
  <hostname>${ICECAST_HOSTNAME:-localhost}</hostname>
  <listen-socket><port>8000</port></listen-socket>
  <http-headers><header name="Access-Control-Allow-Origin" value="*" /></http-headers>
  <paths>
    <basedir>/usr/local/share/icecast</basedir>
    <logdir>/tmp/icecast</logdir>
    <webroot>/usr/local/share/icecast/web</webroot>
    <adminroot>/usr/local/share/icecast/admin</adminroot>
    <alias source="/" dest="/status.xsl" />
  </paths>
  <logging><accesslog>-</accesslog><errorlog>-</errorlog><playlistlog>-</playlistlog><loglevel>3</loglevel><logsize>10000</logsize><logarchive>1</logarchive></logging>
  <changeowner><user>icecast</user><group>icecast</group></changeowner>
  <security><chroot>0</chroot></security>
</icecast>
EOF
exec icecast -c /data/icecast.xml
