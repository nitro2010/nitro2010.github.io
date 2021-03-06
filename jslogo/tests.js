//
// Logo Interpreter in Javascript
//

// Copyright (C) 2011 Joshua Bell
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var canvas_element = document.getElementById("sandbox"), canvas_ctx;
var turtle_element = document.getElementById("turtle"), turtle_ctx;

module("Logo - Testy Jednostkowe", {
  setup: function() {

    // TODO: Replace with mock
    canvas_ctx = canvas_ctx || canvas_element.getContext('2d');
    turtle_ctx = turtle_ctx || turtle_element.getContext('2d');

    this.turtle = new CanvasTurtle(
      canvas_ctx,
      turtle_ctx,
      canvas_element.width, canvas_element.height);

    this.stream = {
      inputbuffer: "",

      read: function(prompt) {
        this.last_prompt = prompt;
        var res = this.inputbuffer;
        this.inputbuffer = "";
        return res;
      },

      outputbuffer: "",

      write: function() {
        for (var i = 0; i < arguments.length; i += 1) {
          this.outputbuffer += arguments[i];
        }
      },

      clear: function() {
        this.outputbuffer = "";
        this.last_prompt = undefined;
      }
    };

    this.interpreter = new LogoInterpreter(this.turtle, this.stream);

    var EPSILON = 1e-12;

    this.assert_equals = function (expression, expected) {
      var actual = this.interpreter.run(expression, {returnResult: true});
      if (typeof expected === 'object') {
        deepEqual(actual, expected, expression);
      } else if (typeof expected === 'number' && typeof actual === 'number') {
        ok(Math.abs(actual - expected) < EPSILON, expression);
      } else {
        strictEqual(actual, expected, expression);
      }
    };

    this.assert_stream = function (expression, expected) {
      this.stream.clear();
      this.interpreter.run(expression, {returnResult: true});
      var actual = this.stream.outputbuffer;
      this.stream.clear();
      equal(actual, expected, expression);
    };

    this.assert_prompt = function (expression, expected) {
      this.stream.clear();
      this.interpreter.run(expression, {returnResult: true});
      var actual = this.stream.last_prompt;
      this.stream.clear();
      equal(actual, expected, expression);
    };

    this.assert_predicate = function(expression, predicate) {
      ok(predicate(this.interpreter.run(expression, {returnResult: true})), expression);
    };

    this.assert_error = function(expression, expected) {
      raises(
        function() {
          this.interpreter.run(expression);
        }.bind(this),
        function(e) {
          if (e.message !== expected) {
            console.log("niepasuj??cy: ", e.message, expected);
          }
          return e.message === expected;
        },
        expression
      );
    };
  }
});

test("Parser", function () {

  //
  // Types
  //

  this.assert_equals('"test', 'test');
  this.assert_equals('1', 1);
  this.assert_equals('[ a b c ]', ["a", "b", "c"]);
  this.assert_equals('[ 1 2 3 ]', ["1", "2", "3"]);
  this.assert_equals('[ 1 -2 3 ]', ["1", "-2", "3"]);
  this.assert_equals('[ 1-2 3 ]', ["1-2", "3"]);
  this.assert_equals('[ 1 2 [ 3 ] 4 *5 ]', ["1", "2", [ "3" ], "4", "*5"]);

  //
  // Unary Minus
  //

  this.assert_equals('-4', -4); // unary
  this.assert_equals('- 4 + 10', 6); // unary
  this.assert_equals('10 + - 4', 6); // unary
  this.assert_equals('(-4)', -4); // unary
  this.assert_equals('przypisz "t 10 -4 :t', 10); // unary - the -4 is a statement
  this.assert_equals('przypisz "t 10 - 4 :t', 6); // infix
  this.assert_equals('przypisz "t 10-4 :t', 6); // infix
  this.assert_equals('przypisz "t 10- 4 :t', 6); // infix
  this.assert_equals('suma 10 -4', 6); // unary
  this.assert_error('suma 10 - 4', 'Nieoczekiwany koniec instrukcji'); // infix - should error
  this.assert_equals('suma 10 (-4)', 6); // unary
  this.assert_equals('suma 10 ( -4 )', 6); // unary
  this.assert_equals('suma 10 ( - 4 )', 6); // unary
  this.assert_equals('suma 10 (- 4)', 6); // unary

  //
  // Case insensitive
  //

  this.assert_equals('przypisz "t 1 :t', 1);
  this.assert_equals('PRZYPISZ "t 1 :t', 1);
  this.assert_equals('przyPISZ "t 1 :t', 1);

  this.assert_equals('przypisz "t 2 :t', 2);
  this.assert_equals('przypisz "T 3 :t', 3);
  this.assert_equals('przypisz "t 4 :T', 4);
  this.assert_equals('przypisz "T 5 :T', 5);

  this.assert_equals('oto foo wynik 6 ju??  foo', 6);
  this.assert_equals('oto FOO wynik 7 ju??  foo', 7);
  this.assert_equals('oto foo wynik 8 ju??  FOO', 8);
  this.assert_equals('oto FOO wynik 9 ju??  FOO', 9);

  //
  // Lists
  //

  this.assert_stream('pisz [ Hello World ]', 'Hello World\n');

  //
  // Numbers
  //

  this.assert_stream('wpisz .2 + .3', '0.5');

  //
  // Arrays
  //

  this.assert_equals('d??ugo???? { a b c }', 3);
  this.assert_equals('d??ugo???? { a b c }@0', 3);
  this.assert_equals('d??ugo???? { a b c }@123', 3);
  this.assert_equals('d??ugo???? { a b c } @ 0', 3);
  this.assert_error('przypisz "a d??ugo???? { 1 2 3 }@1.5', "Nie wiadomo co zrobi?? z: 0.5");

  //
  // Nested Structures
  //

  this.assert_equals('d??ugo???? [ a b [ c d e ] f ]', 4);
  this.assert_equals('d??ugo???? { a b { c d e } f }', 4);
  this.assert_equals('d??ugo???? { a b [ c d e ] f }', 4);
  this.assert_equals('d??ugo???? [ a b { c d e } f ]', 4);
});


test("Wbudowane Struktury Danych", function () {

  //
  // 2.1 Constructors
  //

  this.assert_equals('s??owo "hello "world', 'helloworld');
  this.assert_equals('(s??owo "a "b "c)', 'abc');
  this.assert_equals('(s??owo)', '');

  this.assert_equals('lista 1 2', [1, 2]);
  this.assert_equals('(lista 1 2 3)', [1, 2, 3]);

  this.assert_stream('przypisz "a (tablica 5 0) ' +
                     'powt??rz 5 [ ustawelement numpow-1 :a numpow*numpow ] ' +
                     'poka?? :a', '{1 4 9 16 25}@0\n');
  this.assert_stream('przypisz "a { 1 2 3 } ' +
                     'poka?? :a', '{1 2 3}\n');
  this.assert_stream('przypisz "a { 1 2 3 } @ 10' +
                     'poka?? :a', '{1 2 3}@10\n');

  this.assert_stream('poka?? (listadotablicy [ 1 2 3 ])', '{1 2 3}\n');
  this.assert_stream('poka?? (listadotablicy [ 1 2 3 ] 0)', '{1 2 3}@0\n');

  this.assert_equals('tablicadolisty {1 2 3}', ['1', '2', '3']);
  this.assert_equals('tablicadolisty {1 2 3}@0', ['1', '2', '3']);

  this.assert_equals('zdanie 1 2', [1, 2]);
  this.assert_equals('zd 1 2', [1, 2]);
  this.assert_equals('(zdanie 1)', [1]);
  this.assert_equals('(zdanie 1 2 3)', [1, 2, 3]);
  this.assert_equals('zdanie [a] [b]', ["a", "b"]);
  this.assert_equals('zdanie [a b] [c d]', ["a", "b", "c", "d"]);
  this.assert_equals('zdanie 1 [2 3]', [1, "2", "3"]);

  this.assert_equals('nap 0 ( lista 1 2 3 )', [0, 1, 2, 3]);
  this.assert_equals('nak 0 ( lista 1 2 3 )', [1, 2, 3, 0]);

  this.assert_equals('po????cz "a "b', 'ab');
  this.assert_equals('po????cz "a [b]', ["a", "b"]);

  this.assert_equals('wspak [ a b c ]', ["c", "b", "a"]);

  this.assert_equals('generujg <> generujg', 1);

  //
  // 2.2 Data Selectors
  //

  this.assert_equals('pierwszy (lista 1 2 3 )', 1);
  this.assert_equals('pierwsze [ [ 1 2 3 ] [ "a "b "c] ]', ["1", '"a']);
  this.assert_equals('ostatni [ a b c ]', "c");
  this.assert_equals('bezpierw [ a b c ]', ["b", "c"]);
  this.assert_equals('bp [ a b c ]', ["b", "c"]);
  this.assert_equals('bezpierwszych [ [ 1 2 3 ] [ "a "b "c] ]', [["2", "3"], ['"b', '"c']]);
  this.assert_equals('bps [ [ 1 2 3 ] [ "a "b "c] ]', [["2", "3"], ['"b', '"c']]);
  this.assert_equals('bezost  [ a b c ]', ["a", "b"]);
  this.assert_equals('bo [ a b c ]', ["a", "b"]);

  this.assert_equals('pierwszy "123', '1');
  this.assert_equals('ostatni  "123', '3');
  this.assert_equals('pierwszy "abc', 'a');
  this.assert_equals('ostatni  "abc', 'c');
  //assert_equals('bezpierw "123', '23');
  //assert_equals('bezost  "123', '12');

  this.assert_error('element 0 [ a b c ]', 'Indeks poza zakresem');
  this.assert_equals('element 1 [ a b c ]', "a");
  this.assert_equals('element 2 [ a b c ]', "b");
  this.assert_equals('element 3 [ a b c ]', "c");
  this.assert_error('element 4 [ a b c ]', 'Indeks poza zakresem');

  this.assert_error('element 0 { a b c }', 'Indeks poza zakresem');
  this.assert_equals('element 1 { a b c }', "a");
  this.assert_equals('element 2 { a b c }', "b");
  this.assert_equals('element 3 { a b c }', "c");
  this.assert_error('element 4 { a b c }', 'Indeks poza zakresem');

  this.assert_equals('element 0 { a b c }@0', 'a');
  this.assert_equals('element 1 { a b c }@0', 'b');
  this.assert_equals('element 2 { a b c }@0', 'c');
  this.assert_error('element 3 { a b c }@0', 'Indeks poza zakresem');

  this.assert_stream('przypisz "a { a b c } ' +
                     'ustawelement 2 :a "q ' +
                     'poka?? :a', '{a q c}\n');
  this.assert_stream('przypisz "a { a b c }@0 ' +
                     'ustawelement 2 :a "q ' +
                     'poka?? :a', '{a b q}@0\n');


  for (var i = 0; i < 10; i += 1) {
    this.assert_predicate('los [ 1 2 3 4 ]', function(x) { return 1 <= x && x <= 4; });
  }
  this.assert_equals('usu?? "b [ a b c ]', ["a", "c"]);
  this.assert_equals('usu?? "d [ a b c ]', ["a", "b", "c"]);
  this.assert_equals('usu??zdup [ a b c a b c ]', ["a", "b", "c"]);

  //
  // 2.3 Data Mutators
  //

  this.assert_equals('przypisz "s [] powt??rz 5 [ umie???? "s numpow ] :s', [5, 4, 3, 2, 1]);
  this.assert_equals('przypisz "s [ a b c ] (lista zdejmij "s zdejmij "s zdejmij "s)', ["a", "b", "c"]);
  this.assert_equals('przypisz "q [] powt??rz 5 [ dokolejki "q numpow ] :q', [1, 2, 3, 4, 5]);
  this.assert_equals('przypisz "q [ a b c ] (lista zkolejki "q zkolejki "q zkolejki "q)', ["c", "b", "a"]);

  //
  // 2.4 Predicates
  //

  this.assert_equals('s??owop "a', 1);
  this.assert_equals('s??owop 1', 0);
  this.assert_equals('s??owop [ 1 ]', 0);
  this.assert_equals('s??owop { 1 }', 0);
  this.assert_equals('s??owo? "a', 1);
  this.assert_equals('s??owo? 1', 0);
  this.assert_equals('s??owo? [ 1 ]', 0);
  this.assert_equals('s??owo? { 1 }', 0);

  this.assert_equals('listap "a', 0);
  this.assert_equals('listap 1', 0);
  this.assert_equals('listap [ 1 ]', 1);
  this.assert_equals('listap { 1 }', 0);
  this.assert_equals('lista? "a', 0);
  this.assert_equals('lista? 1', 0);
  this.assert_equals('lista? [ 1 ]', 1);
  this.assert_equals('lista? { 1 }', 0);

  this.assert_equals('tablicap "a', 0);
  this.assert_equals('tablicap 1', 0);
  this.assert_equals('tablicap [ 1 ]', 0);
  this.assert_equals('tablicap { 1 }', 1);
  this.assert_equals('tablica? "a', 0);
  this.assert_equals('tablica? 1', 0);
  this.assert_equals('tablica? [ 1 ]', 0);
  this.assert_equals('tablica? { 1 }', 1);

  this.assert_equals('r??wnep 3 4', 0);
  this.assert_equals('r??wnep 3 3', 1);
  this.assert_equals('r??wnep 3 2', 0);
  this.assert_equals('r??wne? 3 4', 0);
  this.assert_equals('r??wne? 3 3', 1);
  this.assert_equals('r??wne? 3 2', 0);
  this.assert_equals('3 = 4', 0);
  this.assert_equals('3 = 3', 1);
  this.assert_equals('3 = 2', 0);
  this.assert_equals('nier??wnep 3 4', 1);
  this.assert_equals('nier??wnep 3 3', 0);
  this.assert_equals('nier??wnep 3 2', 1);
  this.assert_equals('nier??wne? 3 4', 1);
  this.assert_equals('nier??wne? 3 3', 0);
  this.assert_equals('nier??wne? 3 2', 1);
  this.assert_equals('3 <> 4', 1);
  this.assert_equals('3 <> 3', 0);
  this.assert_equals('3 <> 2', 1);

  this.assert_equals('r??wnep "a "a', 1);
  this.assert_equals('r??wnep "a "b', 0);
  this.assert_equals('"a = "a', 1);
  this.assert_equals('"a = "b', 0);
  this.assert_equals('r??wnep [1 2] [1 2]', 1);
  this.assert_equals('r??wnep [1 2] [1 3]', 0);
  this.assert_equals('[ 1 2 ] = [ 1 2 ]', 1);
  this.assert_equals('[ 1 2 ] = [ 1 3 ]', 0);

  this.assert_equals('r??wnep "a 1', 0);
  this.assert_equals('r??wnep "a [ 1 ]', 0);
  this.assert_equals('r??wnep 1 [ 1 ]', 0);


  this.assert_equals('liczbap "a', 0);
  this.assert_equals('liczbap 1', 1);
  this.assert_equals('liczbap [ 1 ]', 0);
  this.assert_equals('liczbap { 1 }', 0);
  this.assert_equals('liczba? "a', 0);
  this.assert_equals('liczba? 1', 1);
  this.assert_equals('liczba? [ 1 ]', 0);
  this.assert_equals('liczba? { 1 }', 0);

  this.assert_equals('pustep []', 1);
  this.assert_equals('puste? []', 1);
  this.assert_equals('pustep [ 1 ]', 0);
  this.assert_equals('puste? [ 1 ]', 0);
  this.assert_equals('pustep "', 1);
  this.assert_equals('puste? "', 1);
  this.assert_equals('pustep "a', 0);
  this.assert_equals('puste? "a', 0);

  this.assert_equals('pustep {}', 0);

  this.assert_equals('przedp "a "b', 1);
  this.assert_equals('przedp "b "b', 0);
  this.assert_equals('przedp "c "b', 0);
  this.assert_equals('przed? "a "b', 1);
  this.assert_equals('przed? "b "b', 0);
  this.assert_equals('przed? "c "b', 0);

  this.assert_equals('podtekstp "a "abc', 1);
  this.assert_equals('podtekstp "z "abc', 0);
  this.assert_equals('podtekst? "a "abc', 1);
  this.assert_equals('podtekst? "z "abc', 0);

  this.assert_equals('zawiera? "b [ a b c ]', 1);
  this.assert_equals('zawiera? "e [ a b c ]', 0);
  this.assert_equals('zawiera? [ "b ] [ [ "a ] [ "b ] [ "c ] ]', 1);
  this.assert_equals('element? "b [ a b c ]', 1);
  this.assert_equals('element? "e [ a b c ]', 0);
  this.assert_equals('element? [ "b ] [ [ "a ] [ "b ] [ "c ] ]', 1);

  //
  // 2.5 Queries
  //

  this.assert_equals('d??ugo???? [ ]', 0);
  this.assert_equals('d??ugo???? [ 1 ]', 1);
  this.assert_equals('d??ugo???? [ 1 2 ]', 2);
  this.assert_equals('d??ugo???? { 1 2 }@0', 2);
  this.assert_equals('d??ugo???? "', 0);
  this.assert_equals('d??ugo???? "a', 1);
  this.assert_equals('d??ugo???? "ab', 2);

  this.assert_equals('ascii "A', 65);
  this.assert_equals('znak 65', 'A');

  this.assert_equals('zma??ejlitery "ABcd', 'abcd');
  this.assert_equals('zdu??ejlitery "ABcd', 'ABCD');
  this.assert_equals('standardowewyj??cie "whatever', 'whatever');

});


test("Komunikacja", function () {
  expect(22);

  // 3.1 Transmitters

  this.assert_stream('pisz "a', 'a\n');
  this.assert_stream('pisz 1', '1\n');
  this.assert_stream('pisz [ 1 ]', '1\n');
  this.assert_stream('pisz [ 1 [ 2 ] ]', '1 [2]\n');
  this.assert_stream('(pisz "a 1 [ 2 [ 3 ] ])', 'a 1 2 [3]\n');

  this.assert_stream('wpisz "a', 'a');
  this.assert_stream('(wpisz "a 1 [ 2 [ 3 ] ])', 'a12 [3]');

  this.assert_stream('(pisz "hello "world)', "hello world\n");
  this.assert_stream('(wpisz "hello "world)', "helloworld");

  this.assert_stream('poka?? "a', 'a\n');
  this.assert_stream('poka?? 1', '1\n');
  this.assert_stream('poka?? [ 1 ]', '[1]\n');
  this.assert_stream('poka?? [ 1 [ 2 ] ]', '[1 [2]]\n');
  this.assert_stream('(poka?? "a 1 [ 2 [ 3 ] ])', 'a 1 [2 [3]]\n');

  // 3.2 Receivers

  this.stream.inputbuffer = "test";
  this.assert_equals('czytajs??owo', 'test');

  this.stream.inputbuffer = "a b c 1 2 3";
  this.assert_equals('czytajs??owo', 'a b c 1 2 3');

  this.assert_prompt('czytajs??owo', undefined);
  this.assert_prompt('(czytajs??owo "query)', 'query');
  this.assert_prompt('(czytajs??owo "query "extra)', 'query');
  this.assert_prompt('(czytajs??owo [a b c])', 'a b c');

  // 3.3 File Access
  // 3.4 Terminal Access

  this.assert_stream('pisz "a zma??tekst', '');
  this.assert_stream('pisz "a zt', '');

  this.stream.clear();

});


test("Arytmetyka", function () {
  expect(137);

  //
  // 4.1 Numeric Operations
  //

  this.assert_equals('suma 1 2', 3);
  this.assert_equals('(suma 1 2 3 4)', 10);
  this.assert_equals('1 + 2', 3);

  this.assert_equals('"3 + "2', 5);

  this.assert_equals('r????nica 3 1', 2);
  this.assert_equals('3 - 1', 2);
  this.assert_equals('ujemny 3 + 4', -(3 + 4));
  this.assert_equals('- 3 + 4', (-3) + 4);
  this.assert_equals('ujemny 3', -3);
  this.assert_equals('- 3', -3);
  this.assert_equals('iloczyn 2 3', 6);
  this.assert_equals('(iloczyn 2 3 4)', 24);
  this.assert_equals('2 * 3', 6);
  this.assert_equals('iloraz 6 2', 3);
  this.assert_equals('(iloraz 2)', 1 / 2);
  this.assert_equals('6 / 2', 3);

  this.assert_equals('reszta 7 4', 3);
  this.assert_equals('reszta 7 -4', 3);
  this.assert_equals('reszta -7 4', -3);
  this.assert_equals('reszta -7 -4', -3);
  this.assert_equals('7 % 4', 3);
  this.assert_equals('7 % -4', 3);
  this.assert_equals('-7 % 4', -3);
  this.assert_equals('-7 % -4', -3);

  this.assert_equals('mod 7 4', 3);
  this.assert_equals('mod 7 -4', -3);
  this.assert_equals('mod -7 4', 3);
  this.assert_equals('mod -7 -4', -3);

  this.assert_equals('abs -1', 1);
  this.assert_equals('abs 0', 0);
  this.assert_equals('abs 1', 1);


  this.assert_equals('int 3.5', 3);
  this.assert_equals('int -3.5', -3);
  this.assert_equals('zaokr 2.4', 2);
  this.assert_equals('zaokr 2.5', 3);
  this.assert_equals('zaokr 2.6', 3);
  this.assert_equals('zaokr -2.4', -2);
  this.assert_equals('zaokr -2.5', -2);
  this.assert_equals('zaokr -2.6', -3);

  this.assert_equals('pwk 9', 3);
  this.assert_equals('pot??ga 3 2', 9);
  this.assert_equals('3 ^ 2', 9);

  this.assert_equals('exp 2', 7.38905609893065);
  this.assert_equals('log10 100', 2);
  this.assert_equals('ln 9', 2.1972245773362196);

  this.assert_equals('arctg 1', 45);
  this.assert_equals('2*(arctg 0 1)', 180);
  this.assert_equals('sin 30', 0.5);
  this.assert_equals('cos 60', 0.5);
  this.assert_equals('tg 45', 1);

  this.assert_equals('radarctan 1', Math.PI / 4);
  this.assert_equals('2*(radarctan 0 1)', Math.PI);
  this.assert_equals('radsin 0.5235987755982988', 0.5);
  this.assert_equals('radcos 1.0471975511965976', 0.5);
  this.assert_equals('radtan 0.7853981633974483', 1);

  this.assert_equals('isekw 1 4', [1, 2, 3, 4]);
  this.assert_equals('isekw 3 7', [3, 4, 5, 6, 7]);
  this.assert_equals('isekw 7 3', [7, 6, 5, 4, 3]);

  this.assert_equals('rsekw 3 5 9', [3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5]);
  this.assert_equals('rsekw 3 5 5', [3, 3.5, 4, 4.5, 5]);

  //
  // 4.2 Numeric Predicates
  //

  this.assert_equals('wi??kszep 3 4', 0);
  this.assert_equals('wi??kszep 3 3', 0);
  this.assert_equals('wi??kszep 3 2', 1);
  this.assert_equals('wi??ksze? 3 4', 0);
  this.assert_equals('wi??ksze? 3 3', 0);
  this.assert_equals('wi??ksze? 3 2', 1);
  this.assert_equals('3 > 4', 0);
  this.assert_equals('3 > 3', 0);
  this.assert_equals('3 > 2', 1);
  this.assert_equals('wi??kszer??wnep 3 4', 0);
  this.assert_equals('wi??kszer??wnep 3 3', 1);
  this.assert_equals('wi??kszer??wnep 3 2', 1);
  this.assert_equals('wi??kszer??wne? 3 4', 0);
  this.assert_equals('wi??kszer??wne? 3 3', 1);
  this.assert_equals('wi??kszer??wne? 3 2', 1);
  this.assert_equals('3 >= 4', 0);
  this.assert_equals('3 >= 3', 1);
  this.assert_equals('3 >= 2', 1);
  this.assert_equals('mniejszep 3 4', 1);
  this.assert_equals('mniejszep 3 3', 0);
  this.assert_equals('mniejszep 3 2', 0);
  this.assert_equals('mniejsze? 3 4', 1);
  this.assert_equals('mniejsze? 3 3', 0);
  this.assert_equals('mniejsze? 3 2', 0);
  this.assert_equals('3 < 4', 1);
  this.assert_equals('3 < 3', 0);
  this.assert_equals('3 < 2', 0);
  this.assert_equals('mniejszer??wnep 3 4', 1);
  this.assert_equals('mniejszer??wnep 3 3', 1);
  this.assert_equals('mniejszer??wnep 3 2', 0);
  this.assert_equals('mniejszer??wne? 3 4', 1);
  this.assert_equals('mniejszer??wne? 3 3', 1);
  this.assert_equals('mniejszer??wne? 3 2', 0);
  this.assert_equals('3 <= 4', 1);
  this.assert_equals('3 <= 3', 1);
  this.assert_equals('3 <= 2', 0);

  this.assert_equals('"3 < "22', 1);

  //
  // 4.3 Random Numbers
  //

  for (var i = 0; i < 10; i += 1) {
    this.assert_predicate('losowa 10', function(x) { return 0 <= x && x < 10; });
  }
  this.assert_equals('startlos  przypisz "x losowa 100  startlos  przypisz "y losowa 100  :x - :y', 0);
  this.assert_equals('(startlos 123) przypisz "x losowa 100  (startlos 123)  przypisz "y losowa 100  :x - :y', 0);

  //
  // 4.4 Print Formatting
  //

  this.assert_stream('wpisz posta?? 123.456 10 0', '       123');
  this.assert_stream('wpisz posta?? 123.456 10 1', '     123.5'); // note rounding
  this.assert_stream('wpisz posta?? 123.456 10 2', '    123.46'); // note rounding
  this.assert_stream('wpisz posta?? 123.456 10 3', '   123.456');
  this.assert_stream('wpisz posta?? 123.456 10 4', '  123.4560');
  this.assert_stream('wpisz posta?? 123.456 10 5', ' 123.45600');
  this.assert_stream('wpisz posta?? 123.456 10 6', '123.456000');
  this.assert_stream('wpisz posta?? 123.456 10 7', '123.4560000');
  this.assert_stream('wpisz posta?? 123.456 10 8', '123.45600000');

  //
  // 4.5 Bitwise Operations
  //

  this.assert_equals('biti 1 2', 0);
  this.assert_equals('biti 7 2', 2);
  this.assert_equals('(biti 7 11 15)', 3);

  this.assert_equals('bitlub 1 2', 3);
  this.assert_equals('bitlub 7 2', 7);
  this.assert_equals('(bitlub 1 2 4)', 7);

  this.assert_equals('bitalbo 1 2', 3);
  this.assert_equals('bitalbo 7 2', 5);
  this.assert_equals('(bitalbo 1 2 7)', 4);

  this.assert_equals('bitnie 0', -1);
  this.assert_equals('bitnie -1', 0);
  this.assert_equals('biti (bitnie 123) 123', 0);

  this.assert_equals('przesu??arytmetyczniewlewo 1 2', 4);
  this.assert_equals('przesu??arytmetyczniewlewo 8 -2', 2);
  this.assert_equals('przesu??logiczniewlewo 1 2', 4);
  this.assert_equals('przesu??logiczniewlewo 8 -2', 2);

  this.assert_equals('przesu??arytmetyczniewlewo -1024 -1', -512);
  this.assert_equals('przesu??arytmetyczniewlewo -1 -1', -1);
  this.assert_equals('przesu??logiczniewlewo -1 -1', 0x7fffffff);

});


test("Operacje logiczne", function () {
  expect(29);

  this.assert_equals('prawda', 1);
  this.assert_equals('fa??sz', 0);
  this.assert_equals('i 0 0', 0);
  this.assert_equals('i 0 1', 0);
  this.assert_equals('i 1 0', 0);
  this.assert_equals('i 1 1', 1);
  this.assert_equals('(i 0 0 0)', 0);
  this.assert_equals('(i 1 0 1)', 0);
  this.assert_equals('(i 1 1 1)', 1);
  this.assert_equals('lub 0 0', 0);
  this.assert_equals('lub 0 1', 1);
  this.assert_equals('lub 1 0', 1);
  this.assert_equals('lub 1 1', 1);
  this.assert_equals('(lub 0 0 0)', 0);
  this.assert_equals('(lub 1 0 1)', 1);
  this.assert_equals('(lub 1 1 1)', 1);
  this.assert_equals('albo 0 0', 0);
  this.assert_equals('albo 0 1', 1);
  this.assert_equals('albo 1 0', 1);
  this.assert_equals('albo 1 1', 0);
  this.assert_equals('(albo 0 0 0)', 0);
  this.assert_equals('(albo 1 0 1)', 0);
  this.assert_equals('(albo 1 1 1)', 1);
  this.assert_equals('nie 0', 1);
  this.assert_equals('nie 1', 0);

  // short circuits

  this.assert_stream('i 0 (pisz "nope)', '');
  this.assert_stream('lub 1 (pisz "nope)', '');

  this.assert_stream('i 1 (wpisz "yup)', 'yup');
  this.assert_stream('lub 0 (wpisz "yup)', 'yup');

});


test("Grafika", function () {
  expect(69);

  // NOTE: test canvas is 300,300 (so -150...150 coordinates before hitting)
  // edge

  this.interpreter.run('czy????ekran');
  this.assert_equals('czy???? wr???? (lista kierunek pozx pozy)', [0, 0, 0]);

  //
  // 6.1 Turtle Motion
  //

  this.assert_equals('wr???? naprz??d 100 poz', [0, 100]);
  this.assert_equals('wr???? np 100 poz', [0, 100]);
  this.assert_equals('wr???? wstecz 100 poz', [0, -100]);
  this.assert_equals('wr???? ws 100 poz', [0, -100]);
  this.assert_equals('wr???? lewo 45 kierunek', -45);
  this.assert_equals('wr???? lw 45 kierunek', -45);
  this.assert_equals('wr???? prawo 45 kierunek', 45);
  this.assert_equals('wr???? pw 45 kierunek', 45);

  this.assert_equals('ustalpoz [ 12 34 ] poz', [12, 34]);
  this.assert_equals('ustalpozxy 56 78 poz', [56, 78]);
  this.assert_equals('ustalpozxy 0 0 (lista pozx pozy)', [0, 0]);
  this.assert_equals('ustalx 123 pozx', 123);
  this.assert_equals('ustaly 45 pozy', 45);
  this.assert_equals('ustalkierunek 69 kierunek', 69);
  this.assert_equals('skieruj 13 kierunek', 13);

  this.assert_equals('naprz??d 100 pw 90 wr???? (lista kierunek pozx pozy)', [0, 0, 0]);

  this.assert_equals('wr???? arc 123 456 (lista kierunek pozx pozy)', [0, 0, 0]);

  //
  // 6.2 Turtle Motion Queries
  //

  this.assert_equals('ustalpoz [ 12 34 ] poz', [12, 34]);
  this.assert_equals('ustalx 123 pozx', 123);
  this.assert_equals('ustaly 45 pozy', 45);
  this.assert_equals('ustalkierunek 69 kierunek', 69);
  this.assert_equals('skieruj 69 kierunek', 69);
  this.assert_equals('ustalpozxy -100 -100 azymut [ 0 0 ]', 45);

  //
  // 6.3 Turtle and Window Control
  //

  this.assert_equals('poka??mnie widocznyp', 1);
  this.assert_equals('p?? widocznyp', 1);
  this.assert_equals('schowajmnie widocznyp', 0);
  this.assert_equals('s?? widocznyp', 0);
  this.assert_equals('ustalpoz [ 12 34 ] czy???? poz', [12, 34]);
  this.assert_equals('ustalpoz [ 12 34 ] czy????ekran (lista kierunek pozx pozy)', [0, 0, 0]);
  this.assert_equals('ustalpoz [ 12 34 ] cs (lista kierunek pozx pozy)', [0, 0, 0]);

  this.assert_equals('sklej tryb??????wia', 'WRAP');

  this.assert_equals('ustalpozxy 0 0 ustalpozxy 160 160 (lista pozx pozy)', [-140, -140]);

  this.assert_equals('okno tryb??????wia', 'WINDOW');
  this.assert_equals('ustalpozxy 0 0 ustalpozxy 160 160 (lista pozx pozy)', [160, 160]);

  this.assert_equals('p??ot tryb??????wia', 'FENCE');
  this.assert_equals('ustalpozxy 0 0 ustalpozxy 160 160 (lista pozx pozy)', [150, 150]);

  this.assert_equals('sklej tryb??????wia', 'WRAP');

  this.assert_equals('(wpisztekst "a 1 [ 2 [ 3 ] ])', undefined);
  this.assert_equals('ustalwysoko????tekstu 5 rozmiartekstu', [5, 5]);
  this.assert_equals('ustalwysoko????tekstu 10 rozmiartekstu', [10, 10]);

  //
  // 6.4 Turtle and Window Queries
  //

  this.assert_equals('poka??mnie widocznyp', 1);
  this.assert_equals('schowajmnie widocznyp', 0);

  this.assert_equals('sklej tryb??????wia', 'WRAP');
  this.assert_equals('okno tryb??????wia', 'WINDOW');
  this.assert_equals('p??ot tryb??????wia', 'FENCE');
  this.assert_equals('sklej tryb??????wia', 'WRAP');


  this.assert_equals('ustalwysoko????tekstu 5 rozmiartekstu', [5, 5]);

  //
  // 6.5 Pen and Background Control
  //

  this.assert_equals('opu???? opuszczonyp', 1);
  this.assert_equals('podnie?? opuszczonyp', 0);
  this.assert_equals('opu opuszczonyp', 1);
  this.assert_equals('pod opuszczonyp', 0);

  this.assert_equals('pisanie trybpis', 'PAINT');
  this.assert_equals('??cieranie trybpis', 'ERASE');
  this.assert_equals('odwracanie trybpis', 'REVERSE');

  this.assert_equals('ustalkolpis 0 kolpis', 'black');
  this.assert_equals('ukm 0 kolpis', 'black');
  this.assert_equals('ustalkolpis "#123456 kolpis', '#123456');
  this.assert_equals('ustalkolpis [0 50 99] kolpis', '#0080ff');

  this.assert_equals('ustalrozmiarpisaka 6 rozmiarpis', [6, 6]);
  this.assert_equals('ustalrozmiarpisaka [6 6] rozmiarpis', [6, 6]);

  //
  // 6.6 Pen Queries
  //

  this.assert_equals('opu???? opuszczonyp', 1);
  this.assert_equals('podnie?? opuszczonyp', 0);

  this.assert_equals('pisanie trybpis', 'PAINT');
  this.assert_equals('??cieranie trybpis', 'ERASE');
  this.assert_equals('odwracanie trybpis', 'REVERSE');

  this.assert_equals('ustalkolpis 0 kolpis', 'black');
  this.assert_equals('ustalkolpis "#123456 kolpis', '#123456');
  this.assert_equals('ustalrozmiarpisaka 6 rozmiarpis', [6, 6]);

  // 6.7 Saving and Loading Pictures
  // 6.8 Mouse Queries
});

test("Zarz??dzanie obszarem roboczym", function () {
  expect(92);

  //
  // 7.1 Procedure Definition
  //

  this.assert_equals('oto square :x wynik :x * :x ju??  square 5', 25);
  this.assert_equals('oto foo wynik 5 ju??  foo', 5);
  this.assert_equals('oto foo :x :y wynik 5 ju??  foo 1 2', 5);
  this.assert_equals('oto foo :x :y wynik :x + :y ju??  foo 1 2', 3);
  this.assert_equals('oto foo :x :y wynik :x + :y ju??  proc "foo', 'oto foo :x :y\n  wynik :x + :y\nju??');
  this.assert_equals('oto foo :x bar 1 "a + :x [ 1 2 ] ju??  proc "foo', 'oto foo :x\n  bar 1 "a + :x [ 1 2 ]\nju??');
  this.assert_equals('oto foo 1 + 2 - 3 * 4 / 5 % 6 ^ -1 ju??  proc "foo', 'oto foo\n  1 + 2 - 3 * 4 / 5 % 6 ^ -1\nju??');

  this.assert_equals('oto square :x wynik :x * :x ju??  kopiujdef "multbyself "square  multbyself 5', 25);
  // TODO: copydef + redefp

  //
  // 7.2 Variable Definition
  //

  this.assert_equals('przypisz "foo 5 :foo', 5);
  this.assert_equals('przypisz "foo "a :foo', 'a');
  this.assert_equals('przypisz "foo [a b] :foo', ["a", "b"]);
  this.assert_equals('przypisz "n "alpha przypisz :n "beta :alpha', 'beta');

  // by default, make operates in global scope
  this.assert_equals('oto dofoo ' +
                '  przypisz "foo 456 ' +
                '  wynik :foo ' +
                'ju?? ' +
                'przypisz "foo 123 ' +
                'dofoo + :foo', 456 + 456);

  this.assert_equals('oto dofoo2 :foo ' +
                '  przypisz "foo 456 ' +
                '  wynik :foo + :foo ' +
                'ju?? ' +
                'przypisz "foo 123 ' +
                '(dofoo2 111) + :foo', 123 + 456 + 456);

  this.assert_equals('nazwij 5 "foo :foo', 5);
  this.assert_equals('nazwij "a "foo :foo', 'a');
  this.assert_equals('nazwij [a b] "foo :foo', ["a", "b"]);
  this.assert_equals('nazwij "gamma "m  nazwij "delta :m :gamma', 'delta');

  this.assert_equals('oto dofoo ' +
                '  lokalna "foo ' +
                '  przypisz "foo 456' +
                '  wynik :foo ' +
                'ju?? ' +
                'przypisz "foo 123 ' +
                'dofoo + :foo', 456 + 123);

  this.assert_equals('oto dofoo ' +
                '  tw??rzlokaln?? "foo 456' +
                '  wynik :foo ' +
                'ju?? ' +
                'przypisz "foo 123 ' +
                'dofoo + :foo', 456 + 123);

  this.assert_equals('przypisz "baz 321 niech "baz', 321);
  this.assert_equals('przypisz "baz "a niech "baz', 'a');
  this.assert_equals('przypisz "baz [a b c] niech "baz', ["a", "b", "c"]);

  this.assert_equals('globalna "foo 1', 1); // Doesn't actually test anything
  this.assert_equals('(globalna "foo "bar) 1', 1); // Doesn't actually test anything

  this.assert_equals('procedurap "notdefined', 0);
  this.assert_equals('oto foo ju??  procedurap "foo', 1);
  this.assert_equals('procedura? "notdefined', 0);
  this.assert_equals('oto foo ju??  procedura? "foo', 1);

  this.assert_equals('pierwotnep "notdefined', 0);
  this.assert_equals('oto foo ju??  pierwotnep "foo', 0);
  this.assert_equals('pierwotnep "zdanie', 1);
  this.assert_equals('pierwotne? "notdefined', 0);
  this.assert_equals('oto foo ju??  pierwotne? "foo', 0);
  this.assert_equals('pierwotne? "zdanie', 1);

  this.assert_equals('okre??lonep "notdefined', 0);
  this.assert_equals('oto foo ju??  okre??lonep "foo', 1);
  this.assert_equals('okre??lonep "zdanie', 0);
  this.assert_equals('okre??lone? "notdefined', 0);
  this.assert_equals('oto foo ju??  okre??lone? "foo', 1);
  this.assert_equals('okre??lone? "zdanie', 0);

  this.assert_equals('zmiennap "notdefined', 0);
  this.assert_equals('przypisz "foo 5 zmiennap "foo', 1);

  // 7.3 Property Lists

  this.assert_equals('w??p "lname', 0);
  this.assert_equals('przyw??a???? "lname "pname 123  lw?? "lname "pname', 123);
  this.assert_equals('lw?? "lname "nosuchprop', []);
  this.assert_equals('w??a??ciwo???? "lname', ["pname", 123]);
  this.assert_equals('w??p "lname', 1);
  this.assert_equals('usw??a?? "lname "pname  w??a??ciwo???? "lname', []);
  this.assert_equals('w??p "lname', 0);
  this.assert_equals('przyw??a???? "lname "pname 123  lw?? "LNAME "PNAME', 123);

  // 7.4 Workspace Predicates
  // (tested above)

  //
  // 7.5 Workspace Queries
  //

  this.assert_equals('odgrzebwszystko usw  zawarto??ci', [[], [], []]);

  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  zawarto??ci', [['b'], ['a'], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  procedury', ['b']);
  // TODO: primitives
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  globalne', ['a']);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  nazwy', [[], ['a']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??a??ciwo??ci', [[], [], ['c']]);

  this.assert_equals('listanazw "a', [[], ['a']]);
  this.assert_equals('listanazw [a]', [[], ['a']]);
  this.assert_equals('listanazw [a b c]', [[], ['a', 'b', 'c']]);
  this.assert_equals('listaw?? "a', [[], [], ['a']]);
  this.assert_equals('listaw?? [a]', [[], [], ['a']]);
  this.assert_equals('listaw?? [a b c]', [[], [], ['a', 'b', 'c']]);


  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  przypisz "b 2  oto a wynik 1 ju??  oto b wynik 2 ju??  wyma?? [[a] [b]]  zawarto??ci', [['b'], ['a'], []]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  przypisz "b 2  oto a wynik 1 ju??  oto b wynik 2 ju??  usw  zawarto??ci', [[], [], []]);
  // TODO: erase + redefp

  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??proc [[b]]  zawarto??ci', [[], ['a'], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??nazwy [[a]]  zawarto??ci', [['b'], [], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??w?? [[c]]  zawarto??ci', [['b'], ['a'], []]);

  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??listanazw "a  zawarto??ci', [['b'], [], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??listanazw [a]  zawarto??ci', [['b'], [], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??listaw?? "c  zawarto??ci', [['b'], ['a'], []]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  w??listaw?? [c]  zawarto??ci', [['b'], ['a'], []]);

  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[b]]  zawarto??ci', [[], ['a'], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [a]]  zawarto??ci', [['b'], [], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [] [c]]  zawarto??ci', [['b'], ['a'], []]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowajwszystko  zawarto??ci', [[], [], []]);

  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowajwszystko odgrzeb [[b]]  zawarto??ci', [['b'], [], []]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowajwszystko odgrzeb [[] [a]]  zawarto??ci', [[], ['a'], []]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowajwszystko odgrzeb [[] [] [c]]  zawarto??ci', [[], [], ['c']]);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowajwszystko  odgrzebwszystko  zawarto??ci', [['b'], ['a'], ['c']]);

  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowanyp [[b]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[b]]  pochowanyp [[b]]', 1);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[b]]  pochowanyp [[] [a]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[b]]  pochowanyp [[] [] [c]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowanyp [[] [a]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [a]]  pochowanyp [[b]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [a]]  pochowanyp [[] [a]]', 1);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [a]]  pochowanyp [[] [] [c]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowanyp [[] [] [c]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [] [c]]  pochowanyp [[b]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [] [c]]  pochowanyp [[] [a]]', 0);
  this.assert_equals('odgrzebwszystko usw  przypisz "a 1  oto b wynik 2 ju?? przyw??a???? "c "d "e  pochowaj [[] [] [c]]  pochowanyp [[] [] [c]]', 1);

  // 7.6 Workspace Inspection
  // 7.7 Workspace Control

});

test("Struktury kontrolne", function () {
  expect(44);
  //
  // 8.1 Control
  //

  this.assert_equals('przypisz "c 0  zapu???? [ ]  :c', 0);
  this.assert_equals('przypisz "c 0  zapu???? [ przypisz "c 5 ]  :c', 5);

  this.assert_equals('zapu????raportuj [ przypisz "x 1 ]', []);
  this.assert_equals('zapu????raportuj [ 1 + 2 ]', [3]);

  this.assert_equals('przypisz "c 0  powt??rz 5 [ przypisz "c :c + 1 ]  :c', 5);
  this.assert_equals('przypisz "c 0  powt??rz 4 [ przypisz "c :c + numpow ]  :c', 10);

  this.assert_equals('przypisz "c 0  oto foo p??tla [ przypisz "c :c + 1 je??li numpow = 5 [ stopmnie ] ] ju??  foo  :c', 5);
  this.assert_equals('przypisz "c 0  oto foo p??tla [ przypisz "c :c + numpow je??li numpow = 4 [ stopmnie ] ] ju??  foo  :c', 10);
  this.assert_equals('je??liinaczej 1 [ przypisz "r "a ] [ przypisz "r "b ]  :r', 'a');
  this.assert_equals('je??liinaczej 0 [ przypisz "r "a ] [ przypisz "r "b ]  :r', 'b');

  this.assert_equals('oto foo je??li 1 [ wynik "a ] wynik "b ju??  foo', 'a');
  this.assert_equals('oto foo je??li 0 [ wynik "a ] wynik "b ju??  foo', 'b');

  this.assert_equals('przypisz "c 1  test 2 > 1  je??litak  [ przypisz "c 2 ]  :c', 2);
  this.assert_equals('przypisz "c 1  test 2 > 1  je??lit  [ przypisz "c 2 ]  :c', 2);
  this.assert_equals('przypisz "c 1  test 2 > 1  je??linie [ przypisz "c 2 ]  :c', 1);
  this.assert_equals('przypisz "c 1  test 2 > 1  je??lin [ przypisz "c 2 ]  :c', 1);

  this.assert_equals('oto foo p??tla [ je??li numpow = 5 [ przypisz "c 234 stopmnie ] ] ju??  foo  :c', 234);

  this.assert_equals('p??tla [ je??li numpow = 5 [ do???? ] ]', undefined);

  this.assert_equals('oto foo wynik 123 ju??  foo', 123);
  this.assert_equals('oto foo wy 123 ju??  foo', 123);


  this.assert_equals('oto foo .mo??ewynik 5 ju??  foo', 5);
  this.assert_equals('oto foo .mo??ewynik przypisz "c 0 ju??  foo', undefined);


  this.assert_equals('ignoruj 1 > 2', undefined);

  this.assert_equals('przypisz "x 0  dla [ r 1 5 ] [ przypisz "x :x + :r ]  :x', 15);
  this.assert_equals('przypisz "x 0  dla [ r 0 10 2 ] [ przypisz "x :x + :r ]  :x', 30);
  this.assert_equals('przypisz "x 0  dla [ r 10 0 -2 ] [ przypisz "x :x + :r ]  :x', 30);
  this.assert_equals('przypisz "x 0  dla [ r 10 0 -2-2 ] [ przypisz "x :x + :r ]  :x', 18);

  this.assert_equals('przypisz "x 0  wykonuj.dop??ki [ przypisz "x :x + 1 ] :x < 10  :x', 10);
  this.assert_equals('przypisz "x 0  dop??ki :x < 10 [ przypisz "x :x + 1 ]     :x', 10);

  this.assert_equals('przypisz "x 0  wykonuj.dop??kinie [ przypisz "x :x + 1 ] :x > 10  :x', 11);
  this.assert_equals('przypisz "x 0  dop??kinie :x > 10 [ przypisz "x :x + 1 ]     :x', 11);

  this.assert_equals('oto vowelp :letter ' +
                     '  wynik wybierz :letter [ [[a e i o u] "true] [inaczej "false] ] ' +
                     'ju?? ' +
                     '(lista vowelp "a vowelp "b', ['true', 'false']);

  this.assert_equals('oto evenp :n ' +
                     '  wynik nie biti :n 1 ' +
                     'ju?? ' +
                     'oto evens :numbers ' +
                     '  wy warunki [ [ [pustep :numbers]      [] ] ' +
                     '            [ [evenp pierwszy :numbers] ' +
                     '              nap pierwszy :numbers evens bezpierw :numbers] '+
                     '            [ inaczej evens bezpierw :numbers] '+
                     ' ] ' +
                     'ju?? ' +
                     'evens [ 1 2 3 4 5 6 ]', ['2', '4', '6']);

  //
  // 8.2 Template-based Iteration
  //

  this.assert_equals('odnie?? "s??owo ["a "b "c]', '"a"b"c');
  this.assert_equals('odwo??aj "s??owo "a', 'a');
  this.assert_equals('(odwo??aj "s??owo "a "b "c)', 'abc');
  this.assert_equals('(odwo??aj "s??owo)', '');
  this.assert_equals('przypisz "x 0  oto addx :a przypisz "x :x+:a ju??  dlaka??dego "addx [ 1 2 3 4 5 ]  :x', 15);
  this.assert_equals('oto double :x wynik :x * 2 ju??  mapa "double [ 1 2 3 ]', [2, 4, 6]);
  this.assert_equals('oto odd :x wynik :x % 2 ju??  filtr "odd [ 1 2 3 ]', ["1", "3"]);
  this.assert_equals('znajd?? "liczbap (lista "a "b "c 4 "e "f )', 4);
  this.assert_equals('znajd?? "liczbap (lista "a "b "c "d "e "f )', []);
  this.assert_equals('skr???? "suma [ 1 2 3 4 ]', 10);
  this.assert_equals('(skr???? "suma [ 1 2 3 4 ] 10)', 20);

  // TODO: Order of operations
  // TODO: Structures, lists of lists

});

test("Wiadomo??ci b????d??w", function () {

  this.assert_error("oto foo ju?? poka?? foo", "Brak wyj??cia z procedury");
  this.assert_error("[ 1 2", "Oczekiwano ']'");
  this.assert_error("{ 1 2", "Oczekiwano '}'");
  this.assert_error("[ 1 2 }", "Nieoczekiwany '}'");
  this.assert_error("{ 1 2 ]", "Nieoczekiwany ']'");
  this.assert_error("!@#$", "Nie mo??na przetworzy??: '!@#$'");
  this.assert_error("poka?? :nosuchvar", "Nic nie wiadomo o zmiennej NOSUCHVAR");
  this.assert_error("1 / 0", "Dzielenie przez zero");
  this.assert_error("1 % 0", "Dzielenie przez zero");
  this.assert_error("1 + -", "Nieoczekiwany koniec instrukcji");
  this.assert_error("( 1 + 2", "Oczekiwano ')'");
  this.assert_error("( 1 + 2 3", "Oczekiwano ')', zobaczono 3");
  this.assert_error("nosuchproc", "Nic nie wiadomo na temat: NOSUCHPROC");
  this.assert_error("1 + \"1+2", "Oczekiwano liczby");
  this.assert_error("1 + []", "Oczekiwano liczby");
  this.assert_error("(ujemny)", "Oczekiwano liczby");
  this.assert_error("przypisz [] 123", "Oczekiwano ??a??cucha znak??w");
  this.assert_error("(proc)", "Oczekiwano ??a??cucha znak??w");
  this.assert_error("(wyma??)", "Oczekiwano listy");
  this.assert_error("(mapa \"poka??)", "Oczekiwano listy");
  this.assert_error("oto +", "Oczekiwano identyfikatora");
  this.assert_error("oto np :x ws :x ju??", "Nie mo??na przedefiniowa?? nazwy NP");
  this.assert_error("proc \"nosuchproc", "Nic nie wiadomo na temat: NOSUCHPROC");
  this.assert_error("proc \"proc", "Nie mo??na pokaza?? definicji: PROC");
  this.assert_error("element 5 [ 1 2 ]", "Indeks poza zakresem");
  this.assert_error("kopiujdef \"newname \"nosuchproc", "Nic nie wiadomo na temat: NOSUCHPROC");
  this.assert_error("oto foo ju??  kopiujdef \"oto \"foo", "Nie mo??na nadpisa?? specjalnej postaci OTO");
  this.assert_error("oto foo ju??  kopiujdef \"poka?? \"foo", "Nie mo??na nadpisa?? wyra??enia pierwotnego chyba PRZEDEFP jest PRAWD??");
  this.assert_error("wyma?? [ [ oto ] [ ] ]", "Nie mo??na wymaza?? specjalnej postaci OTO");
  this.assert_error("wyma?? [ [ poka?? ] [ ] ]", "Nie mo??na wymaza?? wyra??enia pierwotnego chyba ??e PRZEDEFP jest PRAWD??");
  this.assert_error("wykonuj.dop??ki 1 2", "Oczekiwano bloku");
  this.assert_error("dop??ki 1 2", "Oczekiwano bloku");
  this.assert_error("wykonuj.dop??kinie 1 2", "Oczekiwano bloku");
  this.assert_error("dop??kinie 1 2", "Oczekiwano bloku");
  this.assert_error("odnie?? \"nosuch [ 1 2 ]", "Nie wiadomo nic na temat: NOSUCH");
  this.assert_error("odnie?? \"oto [ 1 2 ]", "Nie mo??na zastosowa?? APPLY do specjalnej nazwy OTO");
  this.assert_error("odnie?? \"dop??ki [ 1 2 ]", "Nie mo??na zastosowa?? APPLY do specjalnej nazwy DOP??KI");
  this.assert_error("dlaka??dego \"nosuch [ 1 2 ]", "Nie wiadomo nic na temat: NOSUCH");
  this.assert_error("dlaka??dego \"oto [ 1 2 ]", "Nie mo??na zastosowa?? FOREACH do specjalnej nazwy OTO");
  this.assert_error("dlaka??dego \"dop??ki [ 1 2 ]", "Nie mo??na zastosowa?? FOREACH do specjalnej nazwy DOP??KI");
  this.assert_error("odwo??aj \"nosuch [ 1 2 ]", "Nie wiadomo nic na temat: NOSUCH");
  this.assert_error("odwo??aj \"oto [ 1 2 ]", "Nie mo??na zastosowa?? INVOKE do specjalnej nazwy OTO");
  this.assert_error("odwo??aj \"dop??ki [ 1 2 ]", "Nie mo??na zastosowa?? INVOKE do specjalnej nazwy DOP??KI");
  this.assert_error("mapa \"nosuch [ 1 2 ]", "Nie wiadomo nic na temat: NOSUCH");
  this.assert_error("mapa \"oto [ 1 2 ]", "Nie mo??na zastosowa?? MAP do specjalnej nazwy OTO");
  this.assert_error("mapa \"dop??ki [ 1 2 ]", "Nie mo??na zastosowa?? MAP do specjalnej nazwy DOP??KI");
  this.assert_error("filtr \"nosuch [ 1 2 ]", "Nie wiadomo nic na temat: NOSUCH");
  this.assert_error("filtr \"oto [ 1 2 ]", "Nie mo??na zastosowa?? FILTER do specjalnej nazwy OTO");
  this.assert_error("filtr \"dop??ki [ 1 2 ]", "Nie mo??na zastosowa?? FILTER do specjalnej nazwy DOP??KI");
  this.assert_error("znajd?? \"nosuch [ 1 2 ]", "Nie wiadomo nic na temat: NOSUCH");
  this.assert_error("znajd?? \"oto [ 1 2 ]", "Nie mo??na zastosowa?? FIND do specjalnej nazwy OTO");
  this.assert_error("znajd?? \"dop??ki [ 1 2 ]", "Nie mo??na zastosowa?? FIND do specjalnej nazwy DOP??KI");
  this.assert_error("skr???? \"nosuch [ 1 2 ]", "Nie wiadomo nic na temat: NOSUCH");
  this.assert_error("skr???? \"oto [ 1 2 ]", "Nie mo??na zastosowa?? REDUCE do specjalnej nazwy OTO");
  this.assert_error("skr???? \"dop??ki [ 1 2 ]", "Nie mo??na zastosowa?? REDUCE do specjalnej nazwy DOP??KI");
  this.assert_error("0", "Nie wiadomo co zrobi?? z: 0");
  this.assert_error("1 + 2", "Nie wiadomo co zrobi?? z: 3");
  this.assert_error("oto foo wynik 123 ju??  foo", "Nie wiadomo co zrobi?? z: 123");
  this.assert_error('pierwszy 123', 'Oczekiwano listy');
  this.assert_error('ostatni  123', 'Oczekiwano listy');
  this.assert_error('bezpierw 123', 'Oczekiwano listy');
  this.assert_error('bezost  123', 'Oczekiwano listy');
  this.assert_error('ustalpoz []', 'Oczekiwano listy o d??ugo??ci 2');
  this.assert_error('ustalpoz [1 2 3]', 'Oczekiwano listy o d??ugo??ci 2');
  this.assert_error('azymut []', 'Oczekiwano listy o d??ugo??ci 2');
  this.assert_error('przypisz "a { 1 2 3 }@1.5', "Nie wiadomo co zrobi?? z: 0.5");
});

test("Testy Regresyjne", function() {
  this.assert_equals('przypisz "x 0  powt??rz 3 [ dla [ i 1 4 ] [ przypisz "x :x + 1 ] ]  :x', 12);
  this.assert_equals('przypisz "x 0  dla [i 0 100 :i + 1] [przypisz "x :x + :i]  :x', 120);
  this.assert_error("np 100 50 rt 90", "Nie wiadomo co zrobi?? z: 50");
  this.assert_equals("oto foo wynik 123 ju??  przypisz \"v foo", undefined);
  this.assert_equals("oto foo ju??", undefined);
  this.assert_equals("5;comment", 5);
  this.assert_equals("5;comment\n", 5);
  this.assert_equals("5 ; comment", 5);
  this.assert_equals("5 ; comment\n", 5);
  this.assert_equals("ustalpoz [ -1 0 ]  123", 123);
  this.assert_equals("oto foo wynik 234 ju?? foo", 234);
  this.assert_equals("oto foo wynik 234 JU?? foo", 234);
  this.assert_error("oto whatever np 100", "Oczekiwano JU??");
  this.assert_equals('"abc;def', "abc");
  this.assert_equals('"abc\\;def', "abc;def");
  this.assert_equals('"abc\\\\def', "abc\\def");
  this.assert_equals('powt??rz 1 [ przypisz "v "abc\\;def ]  :v', "abc;def");
  this.assert_error('powt??rz 1 [ przypisz "v "abc;def ]  :v', "Oczekiwano ']'");
  this.assert_equals('przypisz "a [ a b c ]  przypisz "b :a  zdejmij "a  :b', ["a", "b", "c"]);
  this.assert_equals('oto foo :BAR wynik :BAR ju??  foo 1', 1);
  this.assert_equals('(s??owo "a (znak 10) "b)', 'a\nb');
});