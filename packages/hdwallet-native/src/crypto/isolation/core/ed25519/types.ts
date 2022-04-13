import { Literal, Object as Obj, Static, Union } from "funtypes";
import {FieldElement} from "@iota/crypto.js/src/signatures/edwards25519/fieldElement";

export type Signature = Uint8Array;
export type CurvePoint = FieldElement;
