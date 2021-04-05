const assert = require('assert')
const Automerge = require('../src/automerge')
const Backend = require('../backend')
const uuid = require('../src/uuid')
const ROOT_ID = '00000000-0000-0000-0000-000000000000'

describe('Automerge.ConcurrentUndo', () => {
  describe('concurrent undo', () => {
    let s1, s2, s3
    beforeEach(() => {
      s1 = Automerge.init()
      s2 = Automerge.init()
      s3 = Automerge.init()
    })

    it('should not merge duplicate operations', () => {
      s1 = Automerge.change(s1, doc => doc.a = 10)
      s2 = Automerge.change(s2, doc => doc.a = 10)
      s1 = Automerge.merge(s1, s2)

      assert.deepStrictEqual(Automerge.getHistory(s1).length, 1)
    })

    // it('should undo operation from other node', () => {
    //   s1 = Automerge.change(s1, doc => doc.a = 10)
    //   s2 = Automerge.merge(s2, s1)
    //   s2 = Automerge.undo(s2)

    //   assert.deepStrictEqual(s2, {})
    // })

    // it('should undo and redo operation from other node', () => {
    //   s1 = Automerge.change(s1, doc => doc.a = 10)
    //   s2 = Automerge.merge(s2, s1)
    //   s2 = Automerge.undo(s2)
    //   s2 = Automerge.redo(s2)

    //   assert.deepStrictEqual(s2, {'a' : 10})
    // })

    it('should undo change from other node', () => {
      s1 = Automerge.change(s1, doc => doc.a = 10)
      s2 = Automerge.merge(s2, s1)

      changes = Automerge.getAllChanges(s2)
      s2 = Automerge.undoChange(s2, changes[0])

      assert.deepStrictEqual(s2, {})
    })

    it('should undoChange and redoChange an operation from another node', () => {
      s1 = Automerge.change(s1, doc => doc.a = 10)
      s2 = Automerge.merge(s2, s1)

      changes = Automerge.getAllChanges(s2)
      s2 = Automerge.undoChange(s2, changes[0])
      changes = Automerge.getAllChanges(s2)
      s2 = Automerge.redoChange(s2, changes[1])

      assert.deepStrictEqual(s2, {'a' : 10})
    })

    it('should create DAG when receiving concurrent updates on same property', () => {
      s1 = Automerge.change(s1, doc => doc.a = 10)
      s2 = Automerge.merge(s2, s1)
      s1 = Automerge.change(s1, doc => doc.a = 4)
      s2 = Automerge.change(s2, doc => doc.a = 6)
      s1 = Automerge.merge(s1, s2)

      const pri = s1.a !== s2.a
      const changes = Automerge.getAllChanges(s1)
      if (pri) {
        s1 = Automerge.undoChange(s1, changes[1])
      } else {
        s1 = Automerge.undoChange(s1, changes[2])
      }

      if (pri) {
        assert.deepStrictEqual(s1, {'a' : 6})
      } else {
        assert.deepStrictEqual(s1, {'a' : 4})
      }
    })

    it('should undo twice including operation from other node', () => {
      s1 = Automerge.change(s1, doc => doc.a = 10)
      s2 = Automerge.merge(s2, s1)
      s1 = Automerge.change(s1, doc => doc.a = 4)
      s2 = Automerge.change(s2, doc => doc.a = 6)
      s1 = Automerge.merge(s1, s2)

      const pri = s1.a !== s2.a
      const changes = Automerge.getAllChanges(s1)
      if (pri) {
        console.log('test')
        s1 = Automerge.undoChange(s1, changes[1])
        s1 = Automerge.undoChange(s1, changes[2])
        assert.deepStrictEqual(s1, {'a': 10})
      } else {
        s1 = Automerge.undoChange(s1, changes[2])
        s1 = Automerge.undoChange(s1, changes[1])
        assert.deepStrictEqual(s1, {'a': 10})
      }
    })

    // it('should handle concurrent undo and redo', () => {
    //   // 1
    //   s1 = Automerge.change(s1, doc => doc.a = 'a')
    //   s2 = Automerge.change(s2, doc => doc.a = 'a')

    //   console.log("1")
    //   console.log("a = ", s1)
    //   console.log("b = ", s2)
    //   console.log("c = ", s3)
    //   // 2
    //   s3 = Automerge.merge(s3, s2)

    //   console.log("2")
    //   console.log("a = ", s1)
    //   console.log("b = ", s2)
    //   console.log("c = ", s3)
    //   // 3
    //   s1 = Automerge.merge(s1, s2)
    //   s2 = Automerge.undo(s2)
    //   // s3 = Automerge.undo(s3)

    //   console.log("3")
    //   console.log("a = ", s1)
    //   console.log("b = ", s2)
    //   console.log("c = ", s3)
    //   // 4
    //   s2 = Automerge.merge(s2, s1)
    //   s1 = Automerge.undo(s1)

    //   console.log("4")
    //   console.log("a = ", s1)
    //   console.log("b = ", s2)
    //   console.log("c = ", s3)
    //   // 5
    //   s3 = Automerge.merge(s3, s2)
    //   s2 = Automerge.merge(s2, s1)

    //   console.log("5")
    //   console.log("a = ", s1)
    //   console.log("b = ", s2)
    //   console.log("c = ", s3)
    //   // 6
    //   s2 = Automerge.redo(s2)
    //   s3 = Automerge.merge(s3, s2)

    //   console.log("6")
    //   console.log("a = ", s1)
    //   console.log("b = ", s2)
    //   console.log("c = ", s3)
    //   // 7
    //   s1 = Automerge.redo(s1)
    //   s2 = Automerge.merge(s2, s3)
    //   // s3 = Automerge.undo(s3)

    //   console.log("7")
    //   console.log("a = ", s1)
    //   console.log("b = ", s2)
    //   console.log("c = ", s3)

    //   assert.deepStrictEqual(1, 1)
    // })
  })
})
