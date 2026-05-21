=================================================================
  PLAN DE DIRECCIONAMIENTO - Laboratorio Comunicaciones II
  Grupo 1 | Sede A / Sede B
=================================================================

DISPOSITIVOS Y ROLES
─────────────────────────────────────────────────────────────────
Archivo                  | Dispositivo
─────────────────────────────────────────────────────────────────
router_sedeA.txt         | Router 1941 - SedeA
router_sedeB.txt         | Router 1941 - SedeB
switch_LAN1.txt          | Switch 2960-24TT - LAN1 (SedeA)
switch_LAN2.txt          | Switch 2960-24TT - LAN2 (SedeA)
switch_LAN3.txt          | Switch 2960-24TT - LAN3 (SedeB)
switch_LAN4.txt          | Switch 2960-24TT - LAN4/Servidores (SedeB)
─────────────────────────────────────────────────────────────────

TABLA IPv4
─────────────────────────────────────────────────────────────────
Segmento       | Red              | Prefijo | Gateway
─────────────────────────────────────────────────────────────────
LAN 1          | 172.16.192.0     | /22     | 172.16.192.1
LAN 2          | 172.16.196.0     | /22     | 172.16.196.1
LAN 3          | 172.16.200.0     | /24     | 172.16.200.1
Servidores     | 172.16.202.0     | /29     | 172.16.202.1
Enlace WAN     | 172.16.202.8     | /30     | -
─────────────────────────────────────────────────────────────────

TABLA IPv6
─────────────────────────────────────────────────────────────────
Segmento       | Prefijo IPv6                | Gateway
─────────────────────────────────────────────────────────────────
LAN 1          | 2001:dbe:bef9:1::/64        | 2001:dbe:bef9:1::1
LAN 2          | 2001:dbe:bef9:2::/64        | 2001:dbe:bef9:2::1
LAN 3          | 2001:dbe:bef9:3::/64        | 2001:dbe:bef9:3::1
Servidores     | 2001:dbe:bef9:10::/64       | 2001:dbe:bef9:10::1
Enlace WAN     | 2001:dbe:bef9:ff01::/64     | 2001:dbe:bef9:ff01::1
─────────────────────────────────────────────────────────────────

HOSTS FINALES (IPv4 estáticos de referencia / DHCP asigna dinámicos)
─────────────────────────────────────────────────────────────────
PC1-1  | DHCP LAN1 | GW: 172.16.192.1  | IPv6: 2001:dbe:bef9:1::10/64
PC1-2  | DHCP LAN1 | GW: 172.16.192.1  | IPv6: 2001:dbe:bef9:1::11/64
PC2-1  | DHCP LAN2 | GW: 172.16.196.1  | IPv6: 2001:dbe:bef9:2::10/64
PC2-2  | DHCP LAN2 | GW: 172.16.196.1  | IPv6: 2001:dbe:bef9:2::11/64
PC3-1  | DHCP LAN3 | GW: 172.16.200.1  | IPv6: 2001:dbe:bef9:3::10/64
PC3-2  | DHCP LAN3 | GW: 172.16.200.1  | IPv6: 2001:dbe:bef9:3::11/64
─────────────────────────────────────────────────────────────────

SERVIDORES (IPs estáticas fijas, sin DHCP)
─────────────────────────────────────────────────────────────────
Servidor Web      | 172.16.202.6  | 2001:dbe:bef9:10::10/64 | Puerto 80 (HTTP)
Servidor Correo   | 172.16.202.5  | 2001:dbe:bef9:10::11/64 | Puerto 25 (SMTP), 110 (POP3)
GW Servidores     | 172.16.202.1  | 2001:dbe:bef9:10::1     |
─────────────────────────────────────────────────────────────────

CREDENCIALES (usar en todos los dispositivos)
─────────────────────────────────────────────────────────────────
Enable secret    : Class123
Usuario SSH      : admin
Password usuario : Admin123
Consola          : cisco
Dominio          : finalcomu.com
SSH versión      : 2  (RSA 2048 bits)
─────────────────────────────────────────────────────────────────

NOTAS
- DHCP excluye .1-.10 en cada subred para infraestructura.
- Servidores LAN4 usan IP estática (no DHCP).
- IPv6 en hosts PC: usar "IPv6 Auto Config" (SLAAC) en Packet Tracer
  o configurar manualmente con las direcciones de la tabla IPv6.
- Para SSHv2 en hardware real, usar 'ip ssh version 2' después de
  generar las claves RSA con modulus >= 1024 (recomendado 2048).
=================================================================
