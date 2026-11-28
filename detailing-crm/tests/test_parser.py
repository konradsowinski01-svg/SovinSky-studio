"""Unit tests for title parser."""

from __future__ import annotations

import unittest

from detailing_crm.parser import normalize_phone, parse_title


class TestNormalizePhone(unittest.TestCase):
    def test_plain_9(self):
        self.assertEqual(normalize_phone("663693151"), "+48663693151")

    def test_plus48_spaces(self):
        self.assertEqual(normalize_phone("+48 500 110 750"), "+48500110750")

    def test_0048(self):
        self.assertEqual(normalize_phone("0048501781398"), "+48501781398")


class TestParseTitle(unittest.TestCase):
    def test_phone_service(self):
        p = parse_title("663693151 Wosk wnętrz")
        self.assertEqual(p.phone_e164, "+48663693151")
        self.assertIsNotNone(p.service)

    def test_phone_car_service(self):
        p = parse_title("691616001 Bmw pranie tapicerki")
        self.assertEqual(p.phone_e164, "+48691616001")
        self.assertIsNotNone(p.car)
        self.assertIn("bmw", p.car.lower())

    def test_plus48_honda(self):
        p = parse_title("+48 500 110 750 Honda")
        self.assertEqual(p.phone_e164, "+48500110750")
        self.assertIsNotNone(p.car)
        self.assertIn("honda", p.car.lower())

    def test_name_car_no_phone(self):
        p = parse_title("Andrzej Mercedes")
        self.assertIsNone(p.phone_e164)
        self.assertEqual(p.name, "Andrzej")
        self.assertIsNotNone(p.car)

    def test_mama_dawida(self):
        p = parse_title("Mama Dawida Volvo v40")
        self.assertIsNone(p.phone_e164)
        self.assertIsNotNone(p.name)
        self.assertIn("Mama", p.name)

    def test_mustang(self):
        p = parse_title("691522497 Mustang polerka")
        self.assertEqual(p.phone_e164, "+48691522497")
        self.assertIsNotNone(p.car)
        self.assertIsNotNone(p.service)


if __name__ == "__main__":
    unittest.main()
