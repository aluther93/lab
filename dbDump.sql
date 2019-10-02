-- --------------------------------------------------------
-- Host:                         localhost
-- Server Version:               8.0.16 - MySQL Community Server - GPL
-- Server Betriebssystem:        Win64
-- HeidiSQL Version:             10.1.0.5464
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


-- Exportiere Datenbank Struktur für labor
CREATE DATABASE IF NOT EXISTS `labor` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_german2_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `labor`;

-- Exportiere Struktur von Tabelle labor.abgerufenebefunde
CREATE TABLE IF NOT EXISTS `abgerufenebefunde` (
  `eins` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL,
  `labornr` varchar(50) COLLATE utf8_german2_ci NOT NULL,
  `abgerufenAt` datetime NOT NULL,
  `abgerufenFrom` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci DEFAULT NULL,
  `ldtVersion` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci DEFAULT NULL,
  `zeichensatz` int(11) DEFAULT NULL,
  `content` text CHARACTER SET utf8 COLLATE utf8_german2_ci,
  `aeDatum` date DEFAULT NULL,
  PRIMARY KEY (`eins`,`labornr`,`abgerufenAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_german2_ci;

-- Daten Export vom Benutzer nicht ausgewählt
-- Exportiere Struktur von Tabelle labor.befunde
CREATE TABLE IF NOT EXISTS `befunde` (
  `quelle` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL,
  `eins` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL,
  `aeDatum` date NOT NULL,
  `vorsatz` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci DEFAULT NULL,
  `zeit` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `orgid` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `labornr` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL,
  `status` enum('bereit','gesperrt','abgerufen') COLLATE utf8_german2_ci DEFAULT 'bereit',
  `befArt` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `befTyp` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `name` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `vorname` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `gebTag` date DEFAULT NULL,
  `ldtVersion` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `zeichensatz` int(11) DEFAULT NULL,
  `content` text COLLATE utf8_german2_ci,
  PRIMARY KEY (`quelle`,`eins`,`aeDatum`,`zeit`,`labornr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_german2_ci;

-- Daten Export vom Benutzer nicht ausgewählt
-- Exportiere Struktur von Tabelle labor.einsender
CREATE TABLE IF NOT EXISTS `einsender` (
  `eins` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL,
  `bsnr1` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci DEFAULT NULL,
  `bsnr2` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `strasse` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `plz` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `ort` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `kbv` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `kundenNr` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `zeichensatz` int(11) DEFAULT NULL,
  PRIMARY KEY (`eins`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_german2_ci;

-- Daten Export vom Benutzer nicht ausgewählt
-- Exportiere Struktur von Tabelle labor.mappings
CREATE TABLE IF NOT EXISTS `mappings` (
  `eins` varchar(50) COLLATE utf8_german2_ci DEFAULT NULL,
  `quelle` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL,
  `quellkuerzel` varchar(50) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL,
  PRIMARY KEY (`quelle`,`quellkuerzel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_german2_ci;

-- Daten Export vom Benutzer nicht ausgewählt
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
